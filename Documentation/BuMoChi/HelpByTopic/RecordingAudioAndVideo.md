# Recording audio and screen video to disk

A runnable, block-by-block test is provided in [RecordingAudioAndVideo.scd](RecordingAudioAndVideo.scd). It defines a simple sine-tone sonification, maps hips and right-hand movement, and includes both audio-only and audio-plus-screen recording commands.

## Purpose

BuMoChi should be able to record the SuperCollider server output and a screen capture as one take. Both files should be created from one `Bmc.sonifyTake` operation, saved together, and stopped automatically when animation-clip playback stops.

The screen recorder should be controlled from SuperCollider, but the actual screen capture can be performed by a small Python helper that starts and stops FFmpeg. This separates operating-system process management from the musical and animation logic in `BmcTakeSonifier`.

## User interface

The existing `record` flag continues to control audio recording. A separate flag enables screen capture:

```supercollider
Bmc.sonifyTake(
    \ishidomaru1,
    ~sonification,
    record: true,
    screenCapture: true
);
```

Keeping the flags separate permits audio-only, video-only, audio-and-video, and unrecorded rehearsal takes. The complete implemented signature also accepts `loop`, `rate`, `startFrame`, and `endFrame` so the recorded take metadata describes the actual source range and playback settings.

## Recording directory and take names

By default, takes are stored below:

```supercollider
Platform.userAppSupportDir +/+ "Recordings"
```

Because screen recordings can consume substantial disk space, the recording root is configurable and may point to an external disk. Set it in code:

```supercollider
Bmc.videoRecordingFolder_("/Volumes/PerformanceMedia/BuMoChi Recordings");
```

or choose a directory with the macOS folder dialog:

```supercollider
Bmc.chooseVideoRecordingFolder;
```

Inspect the current setting with:

```supercollider
Bmc.videoRecordingFolder;
```

The selection is stored persistently in:

```supercollider
Platform.userAppSupportDir +/+ "video_recording_folder.scd"
```

This file contains a readable SuperCollider event:

```supercollider
(videoRecordingFolder: "/Volumes/PerformanceMedia/BuMoChi Recordings")
```

It is reloaded after class-library recompilation and after restarting SuperCollider. If the preference file does not yet exist, BuMoChi writes it with the default application-support `Recordings` directory. If a configured external disk is not mounted when a take begins, BuMoChi reports that the recording folder is unavailable and does not silently fall back to the internal disk.

Each take is saved in its own directory. The directory name combines the clip name and the accepted conventional timestamp in `YYMMDDHHMMSS` form:

```text
<configured video recording folder>/
    ishidomaru1_260901152734/
        ishidomaru1_260901152734.wav
        ishidomaru1_260901152734.mp4
        ishidomaru1_260901152734.scd
```

The same basename groups the audio, video, and SuperCollider metadata unambiguously. The `.scd` file is a required part of every take, not an optional generic metadata sidecar. It records the source clip, exact playback configuration, and the complete SuperCollider synthesis and mapping source needed to inspect and reuse the sonification.

`YYMMDDHHMMSS` contains year, month, day, hour, minute, and second. `BmcTakeRecordingPath` implements this using `Date.localtime.stamp` with its separator removed. If two takes are nevertheless created within the same second, it adds a numeric suffix and never overwrites an existing take directory.

## Implemented first version

The first version consists of `BmcTakeRecordingPath`, `BmcTakeMetadata`, `BmcScreenRecorder`, and `PipelineApplications/bmc_screen_capture.py`, integrated through `BmcTakeSonifier`. It creates the take directory and initial `.scd` metadata before capture, waits for FFmpeg to create the video file, records SuperCollider audio to the matching `.wav` path, and stops both recorders from the clip player's end event. The Python helper sends FFmpeg a graceful interrupt so the MP4 container can be finalized. After both files close, FFmpeg adds the WAV recording to the MP4 as AAC audio.

The initial metadata saves all playback parameters, file names, status, actual take duration, the current Interpreter command text, and an `asCompileString` description of the supplied sonification object. Interpreter-history reconstruction across several evaluated blocks remains experimental, as discussed below.

## Components

### `BmcTakeRecordingPath`

This helper should create the take basename and paths once, before either recorder starts. Its result should include at least:

- the take directory;
- the shared basename;
- the audio-file path;
- the video-file path; and
- the `.scd` metadata-file path.

It must create the directory, reject unsafe clip-name characters or replace them predictably, and never overwrite an earlier take.

### `BmcTakeMetadata`

This helper collects, writes, and finalizes the take description as an `.scd` file. The file evaluates to one SuperCollider `Event`, making it readable both as text and from SuperCollider. The implemented first version provides `interpreterCode` and `sonificationDescription`. The richer `synthesisCode` and `mappingCode` functions shown below are the target format that we will refine after testing Interpreter-history capture:

```supercollider
~take = ".../ishidomaru1_260901152734.scd".load;
~take[\sourceClip];
~take[\playback];
~take[\interpreterCode];
~take[\sonificationDescription];
```

The event should contain at least:

```supercollider
(
    format: \bmcAudioVideoTake,
    formatVersion: 1,
    takeName: \ishidomaru1_260901152734,
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
        audio: "ishidomaru1_260901152734.wav",
        video: "ishidomaru1_260901152734.mp4"
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

The example code is illustrative of the intended refined format. In that target format, `synthesisCode` and `mappingCode` are SuperCollider functions so that they remain executable SuperCollider source. Loading the metadata file creates the functions but does not run them; the user explicitly runs `.value` when reconstruction is wanted. Until Interpreter-history capture is refined, the first implementation records the current evaluated Interpreter command as a String and marks the supplied sonification with its available `asCompileString` description rather than pretending that a complete SynthDef source has been recovered.

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

During live capture, FFmpeg records video only and SuperCollider records the definitive audio. This avoids duplicate sound, feedback, and dependence on a virtual audio device. After capture stops and SuperCollider confirms that the WAV has closed, FFmpeg remuxes the MP4 with the WAV encoded as AAC. The video stream is copied without re-encoding. FFmpeg's `-shortest` option trims whichever stream is longer, so the completed MP4 ends at the shorter audio/video duration. The original WAV remains beside it as the uncompressed master audio.

If muxing fails, the original silent MP4 and WAV remain available. The metadata status becomes `\muxFailed` and `videoHasAudio` remains false. A successful audio-and-video take records `videoHasAudio: true`.

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

Both stop requests originate in the same SuperCollider callback, but audio and video are recorded by different processes and therefore cannot stop on the same audio sample. Their endpoints should normally differ by only a small process-scheduling delay. BuMoChi waits for the WAV to close, then automatically muxes it into the MP4 and trims the longer stream to the shorter duration. The countdown remains a strong synchronization reference for reviewing or refining alignment.

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
    takeDirectory: ".../Recordings/ishidomaru1_260901152734",
    audioPath: ".../ishidomaru1_260901152734.wav",
    videoPath: ".../ishidomaru1_260901152734.mp4",
    metadataPath: ".../ishidomaru1_260901152734.scd"
)
```

An error starting screen capture should be reported before the countdown begins. The default policy should be to cancel an audio-and-video take if video was explicitly requested but could not start. We may later add an option allowing the take to continue with audio only.

## macOS requirements

The program that launches FFmpeg must have macOS Screen Recording permission. On first use, macOS may display a permission request. The user may need to enable the relevant application under **System Settings > Privacy & Security > Screen & System Audio Recording** and restart SuperCollider before capture succeeds.

The default recorded display is FFmpeg AVFoundation device **`Capture screen 0`**. On the current development Mac this is the first/main macOS display. Place the Godot project window on that display and make sure the animation is visible there before starting `Bmc.sonifyTake`. Other windows, notifications, and pointer movement visible on that display will also be recorded.

When monitors are connected, disconnected, or rearranged, verify which display FFmpeg calls `Capture screen 0` before an important take:

```bash
ffmpeg -f avfoundation -list_devices true -i ""
```

Display selection should eventually become a `Bmc.sonifyTake` option. The current implementation always requests `Capture screen 0`.

## Remaining development and testing

1. Grant macOS Screen Recording permission and test an actual capture from SuperCollider on the rehearsal machine.
2. Test normal clip completion, manual stop, cancellation during countdown, server failure, FFmpeg failure, and two consecutive takes.
3. Refine Interpreter history capture and the executable synthesis/mapping representation after examining real saved takes.
4. Add measured audio and video media durations to finalized metadata.
5. Make display and frame-rate selection configurable from the SuperCollider API.
6. Test whether start-time offset correction beyond duration trimming is needed after reviewing real countdown recordings.
