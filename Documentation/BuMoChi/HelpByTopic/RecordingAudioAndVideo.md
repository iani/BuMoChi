# Recording audio and screen video to disk

## Purpose

BuMoChi should be able to record the SuperCollider server output and a screen capture as one take. Both files should be created from one `Bmc.sonifyTake` operation, saved together, and stopped automatically when animation-clip playback stops.

The screen recorder should be controlled from SuperCollider, but the actual screen capture can be performed by a small Python helper that starts and stops FFmpeg. This separates operating-system process management from the musical and animation logic in `BmcTakeSonifier`.

## Proposed user interface

The existing `record` flag continues to control audio recording. A separate flag enables screen capture:

```supercollider
Bmc.sonifyTake(
    \ishidomaru1,
    ~sonification,
    record: true,
    screenCapture: true
);
```

Keeping the flags separate permits audio-only, video-only, audio-and-video, and unrecorded rehearsal takes. We may later replace the two flags with a recording-options object if more settings are needed, but independent Boolean arguments are sufficient for the first implementation.

## Recording directory and take names

All takes should be stored below:

```supercollider
Platform.userAppSupportDir +/+ "Recordings"
```

Each take is saved in its own directory. The directory name combines the clip name and a timestamp in the requested `YYMMDDHHSS` form:

```text
<SuperCollider user application support>/Recordings/
    ishidomaru1_2609011534/
        ishidomaru1_2609011534.wav
        ishidomaru1_2609011534.mp4
        ishidomaru1_2609011534.scd
```

The same basename groups the audio, video, and SuperCollider metadata unambiguously. The `.scd` file is a required part of every take, not an optional generic metadata sidecar. It records the source clip, exact playback configuration, and the complete SuperCollider synthesis and mapping source needed to inspect and reuse the sonification.

`YYMMDDHHSS` contains year, month, day, hour, and second, but no minute field. Consequently, two takes made in different minutes of the same hour at the same second value would receive the same name. The implementation must avoid overwriting an existing directory, for example by adding `_02`, `_03`, and so on. Before implementation, we may instead decide to use the conventional collision-resistant `YYMMDDHHMMSS` form, which includes minutes.

## Proposed components

### `BmcTakeRecordingPath`

This helper should create the take basename and paths once, before either recorder starts. Its result should include at least:

- the take directory;
- the shared basename;
- the audio-file path;
- the video-file path; and
- the `.scd` metadata-file path.

It must create the directory, reject unsafe clip-name characters or replace them predictably, and never overwrite an earlier take.

### `BmcTakeMetadata`

This helper should collect, write, and finalize the take description as an `.scd` file. The file should evaluate to one SuperCollider `Event`, making it readable both as text and from SuperCollider:

```supercollider
~take = ".../ishidomaru1_2609011534.scd".load;
~take[\sourceClip];
~take[\playback];
~take[\synthesisCode].value;
~take[\mappingCode].value;
```

The event should contain at least:

```supercollider
(
    format: \bmcAudioVideoTake,
    formatVersion: 1,
    takeName: \ishidomaru1_2609011534,
    createdAt: "2026-09-01 15:27:34",

    sourceClip: \ishidomaru1,
    playerName: \default,
    playback: (
        startFrame: 0,
        endFrame: 1842,
        speed: 1.0,
        loop: false,
        sourceDuration: 30.716,
        duration: 30.716
    ),

    files: (
        audio: "ishidomaru1_2609011534.wav",
        video: "ishidomaru1_2609011534.mp4"
    ),

    synthesisCode: {
        SynthDef(\rehearsalSine, { |out = 0, freq = 220, amp = 0|
            var signal = SinOsc.ar(freq.lag(0.05)) * amp.lag(0.08);
            Out.ar(out, signal.dup);
        }).add;
    },

    mappingCode: {
        BmcLiveSonification(
            \rehearsalSine,
            [
                BmcSonificationMapping.absolute(
                    \hips, \y, \freq, #[0.7, 1.3], #[110, 880]
                ),
                BmcSonificationMapping.rate(
                    \rightHand, \y, \amp, #[-2, 2], #[0, 0.2]
                )
            ]
        )
    }
)
```

The example code is illustrative; the generated file must contain the actual synthesis and mappings used for that take. `synthesisCode` and `mappingCode` are SuperCollider functions so that they remain formatted as executable SuperCollider source. Loading the metadata file creates the functions but does not run them. The user explicitly runs `.value` when reconstruction is wanted.

The playback metadata has the following meanings:

- `startFrame`: first source-clip frame included in playback;
- `endFrame`: last source-clip frame included in playback;
- `speed`: the `BmcClipPlayer` playback rate;
- `loop`: whether playback looping was enabled;
- `sourceDuration`: elapsed source-clip time between the selected first and last frames; and
- `duration`: expected performed duration after applying `speed`.

For a normal non-looping take, `duration` is the selected source duration divided by `speed`. An indefinitely looping take has no predetermined duration, so this field should initially be `nil`; when recording stops, an additional `actualDuration` field should record the measured take duration. The finalized metadata should also contain measured `audioDuration` and `videoDuration` when these values can be obtained reliably.

The synthesis source may be retrieved from the code most recently evaluated by the SuperCollider Interpreter. This is a promising way to preserve the actual rehearsal code without requiring the user to duplicate it in a separate argument. We should test this with the normal Emacs and SuperCollider evaluation workflows before fixing the metadata format. In particular, we need to determine reliably which evaluated region belongs to a take, whether several separately evaluated blocks must be accumulated, and how references to previously defined environment variables should be represented.

The current `BmcLiveSonification` object itself knows its SynthDef name, mappings, and Synth arguments, but it does not retain the original SynthDef source. Interpreter-history capture can supply that missing context. Other possible or complementary approaches remain:

1. introduce a serializable `BmcSonificationSpec` that stores both the SynthDef-building function and the mapping-building function;
2. extend `BmcLiveSonification` to retain explicitly supplied source functions; or
3. require `sonifyTake` to receive synthesis and mapping source alongside an advanced arbitrary setup function.

We will revisit this choice after trying Interpreter-based capture with real sonification sessions and then refine the code-saving format. A serializable specification may still be useful because it makes reproducibility intrinsic to a sonification definition, while Interpreter capture preserves the concrete code the artist actually evaluated. The two approaches need not be exclusive. `BmcSonificationMapping` and the declarative parts of `BmcLiveSonification` should also support a stable `asCompileString` or equivalent representation. If complete source cannot be recovered for a take, the metadata should mark that fact clearly rather than claiming full reproducibility.

The metadata writer should first write a temporary `.scd` file and then replace the destination atomically. It writes the planned playback data before the countdown and finalizes measured durations and completion status after both recorders stop. A cancelled or failed take should retain its directory and metadata with a status such as `\cancelled` or `\failed`, rather than being mistaken for a successful take.

### `BmcScreenRecorder`

This SuperCollider helper should own the screen-capture process for one take. Its responsibilities are:

- start the Python screen-capture helper with the selected video path;
- retain its process identifier or control-channel information;
- wait for a positive ready response before the take proceeds;
- report whether capture is starting, active, stopping, or failed;
- request a graceful stop; and
- ensure that an abandoned process is cleaned up when a take is cancelled or the class library is shut down.

Calling `stop` when no capture is active should be harmless and should post a short status message instead of throwing an error.

### Python FFmpeg helper

The Python helper should start FFmpeg as a child process and capture the selected macOS display. FFmpeg is preferable to directly invoking `screencapture -v` because its process lifetime, readiness, output format, frame rate, and graceful termination are easier to control.

For the initial implementation, FFmpeg should capture video only. SuperCollider remains responsible for recording the definitive audio. This avoids duplicate sound, feedback, and dependence on a virtual audio device.

The helper needs two operations:

```text
start --output <video-path> [--display <display>] [--fps <rate>]
stop  --control-file <path>
```

The exact control mechanism may be a retained process identifier plus a small status/control file, or a persistent helper process with standard-input commands. Whichever mechanism is chosen, stopping must send FFmpeg a graceful interrupt such as `SIGINT` and wait for it to finish writing the movie container. Abruptly killing FFmpeg can leave an unreadable or incomplete MP4 file.

The helper should report a machine-readable `ready`, `stopped`, or `error` result. SuperCollider must not assume that screen capture is active merely because the process-launch command returned.

## Start sequence

The start sequence should be coordinated by `BmcTakeSonifier.start`:

1. Validate the clip and requested recording options.
2. Create one take directory and the shared audio/video basename.
3. Collect the source clip, start frame, end frame, speed, loop state, durations, and complete synthesis and mapping code, then write the initial `.scd` metadata file.
4. If `screenCapture` is true, start `BmcScreenRecorder` and wait until FFmpeg reports that it is ready.
5. If `record` is true, call `Server.prepareForRecord` with the generated audio path, synchronize with the server, and start server recording.
6. Start the existing audible countdown.
7. Start animation playback on the final synchronization cue, using the timing already implemented by `BmcTakeSonifier`.
8. Start the selected sonification processes according to the existing take timing.

Starting screen capture first prevents the beginning of the countdown from being lost while FFmpeg initializes. The resulting video may contain a short silent lead-in. This is preferable to missing synchronization material and can be trimmed automatically later if required.

## Stop sequence

`BmcTakeSonifier.finish` is already called from the animation player's end notification. It should remain the single owner of take shutdown. From that event it should:

1. stop the countdown if it is still active;
2. stop all sonification processes;
3. request graceful screen-capture termination;
4. stop SuperCollider server recording;
5. wait for FFmpeg to confirm that the video file has been finalized; and
6. finalize the `.scd` metadata with completion status and measured durations; and
7. clear all audio- and video-recording state.

Manual `Bmc.stopTake` and cancellation during the countdown must use the same cleanup path. Cleanup should be idempotent so that a second end notification cannot stop or free anything twice.

Both stop requests originate in the same SuperCollider callback, but audio and video are recorded by different processes and therefore cannot stop on the same audio sample. Their endpoints should normally differ by only a small process-scheduling delay. The countdown supplies a strong synchronization reference, and a future post-processing step could align or mux the files using measured timestamps.

## State and status reporting

`Bmc.takeStatus` should be expanded to show at least:

```supercollider
(
    clipName: \ishidomaru1,
    playerName: \default,
    pending: false,
    playing: true,
    recording: true,
    screenCapturing: true,
    takeDirectory: ".../Recordings/ishidomaru1_2609011534",
    audioPath: ".../ishidomaru1_2609011534.wav",
    videoPath: ".../ishidomaru1_2609011534.mp4",
    metadataPath: ".../ishidomaru1_2609011534.scd"
)
```

An error starting screen capture should be reported before the countdown begins. The default policy should be to cancel an audio-and-video take if video was explicitly requested but could not start. We may later add an option allowing the take to continue with audio only.

## macOS requirements

The program that launches FFmpeg must have macOS Screen Recording permission. On first use, macOS may display a permission request. The user may need to enable the relevant application under **System Settings > Privacy & Security > Screen & System Audio Recording** and restart SuperCollider before capture succeeds.

The initial implementation should select `Capture screen 0`, which FFmpeg currently detects on the development computer. Display selection should eventually be configurable because device indices can change when monitors are attached or removed.

## Suggested implementation stages

1. Implement and test the Python FFmpeg helper independently from a terminal.
2. Implement `BmcScreenRecorder` and test start, stop, cancellation, failure, and repeated takes from SuperCollider.
3. Implement `BmcTakeRecordingPath` and explicit audio recording paths.
4. Implement the serializable sonification specification and `BmcTakeMetadata`, including round-trip tests that load the `.scd` and reconstruct its mappings.
5. Add `screenCapture` to `Bmc.sonifyTake` and integrate both recorders and metadata finalization with `BmcTakeSonifier`.
6. Extend `Bmc.takeStatus` and document permissions and display selection.
7. Test normal clip completion, manual stop, cancellation during countdown, server failure, FFmpeg failure, incomplete sonification source, and two consecutive takes.
8. Optionally add a later mux/alignment operation without changing the original audio, video, and `.scd` files.
