BmcTakeSonifier {
	var <server, <routine, <player, <clipName, <playerName;
	var <isPending = false, <isPlaying = false, <isRecording = false;
	var <recordingPath, <metadata, <screenRecorder;
	var endController, countdownPlayer, sonificationCleanup;
	var audioRequested = false, videoRequested = false;

	*new { |server| ^super.new.init(server) }

	init { |argServer|
		server = argServer ?? { Server.default };
		^this
	}

	start { |argClipName, sonifications, argPlayerName = \default, record = false,
		screenCapture = false, loop = false, rate = 1.0, startFrame = 0, endFrame|
		var clip, selectedEndFrame, interpreterCode;
		if(isPending or: { isPlaying }) { this.stop };
		clipName = argClipName.asSymbol;
		playerName = argPlayerName.asSymbol;
		clip = Bmc.clip(clipName);
		if(clip.isNil) { Error("Unknown Bmc clip: %".format(clipName)).throw };
		if(clip.isEmpty) { Error("Cannot sonify empty Bmc clip: %".format(clipName)).throw };
		if(rate <= 0) { Error("Bmc take rate must be greater than zero").throw };
		startFrame = startFrame.asInteger.clip(0, clip.size - 1);
		selectedEndFrame = (endFrame ?? { clip.size - 1 }).asInteger.clip(startFrame, clip.size - 1);
		player = Bmc.player(playerName);
		player.stop;
		audioRequested = record == true;
		videoRequested = screenCapture == true;
		recordingPath = nil;
		metadata = nil;
		screenRecorder = nil;
		if(audioRequested or: { videoRequested }) {
			recordingPath = BmcTakeRecordingPath(clipName);
			interpreterCode = thisProcess.interpreter.cmdLine;
			metadata = BmcTakeMetadata(
				recordingPath, clipName, playerName, clip, startFrame,
				selectedEndFrame, rate, loop, interpreterCode,
				sonifications.asCompileString
			);
		};
		isPending = true;

		endController = SimpleController(player);
		endController.put(\end, { this.finish });

		routine = Routine({
			if(videoRequested) {
				screenRecorder = BmcScreenRecorder.new;
				screenRecorder.start(recordingPath.videoPath, recordingPath.screenStatePath);
				while { screenRecorder.isStarting } { 0.05.wait };
				if(screenRecorder.error.notNil) {
					this.finish(\failed);
					Error(screenRecorder.error).throw
				};
			};
			if(audioRequested) {
				server.prepareForRecord(recordingPath.audioPath);
				server.sync;
				server.record;
				isRecording = true;
			};
			if(metadata.notNil) { metadata.status_(\recording) };
			countdownPlayer = Pbind(
				\degree, Pseq([Pseq((0..4), 2), 7]),
				\legato, 0.25
			).play;
			// The first note is at the current beat; the final degree 7 begins at beat + 10.
			10.wait;
			Bmc.playClip(
				clipName, loop: loop, rate: rate, startFrame: startFrame,
				endFrame: selectedEndFrame, playerName: playerName
			);
			isPending = false;
			isPlaying = true;
			// The mapped sonification begins after the final degree 7 cue completes.
			1.wait;
			sonificationCleanup = this.startSonifications(sonifications);
		}).play(TempoClock.default);
		^this
	}

	startSonifications { |specification|
		if(specification.isNil) { ^nil };
		if(specification.isKindOf(Function)) {
			^specification.value(player, clipName, playerName)
		};
		if(specification.isSequenceableCollection) {
			^specification.collect { |item| this.startSonifications(item) }
		};
		if(specification.isKindOf(BmcLiveSonification)) {
			^specification.start(player, \frame)
		};
		Error("Unsupported Bmc take sonification specification").throw
	}

	stopSonifications { |object|
		if(object.isNil) { ^this };
		if(object.isSequenceableCollection) {
			object.do { |item| this.stopSonifications(item) };
			^this
		};
		if(object.isKindOf(Function)) { object.value; ^this };
		if(object.respondsTo(\free)) { object.free };
		^this
	}

	finish { |finishStatus = \complete|
		var audioWasRecorded = isRecording;
		var finishMetadata, finishVideo;
		if(routine.notNil) { routine.stop; routine = nil };
		if(countdownPlayer.notNil) { countdownPlayer.stop; countdownPlayer = nil };
		this.stopSonifications(sonificationCleanup);
		sonificationCleanup = nil;
		if(isRecording and: { server.isRecording }) { server.stopRecording };
		isRecording = false;
		isPending = false;
		isPlaying = false;
		if(endController.notNil) { endController.remove; endController = nil };
		finishMetadata = { |videoWasRecorded, videoHasAudio = false, statusOverride|
			if(metadata.notNil) {
				metadata.finish(
					statusOverride ?? { finishStatus }, audioWasRecorded,
					videoWasRecorded, videoHasAudio
				)
			}
		};
		finishVideo = {
			if(screenRecorder.notNil and: {
				screenRecorder.isStarting or: { screenRecorder.isRecording }
			}) {
				if(metadata.notNil) { metadata.status_(\finalizing) };
				screenRecorder.stop({ |success|
					finishMetadata.value(
						true,
						success and: { audioWasRecorded },
						if(audioWasRecorded and: { success.not }) { \muxFailed } { nil }
					)
				}, if(audioWasRecorded) { recordingPath.audioPath } { nil })
			} {
				finishMetadata.value(false, false)
			}
		};
		if(audioWasRecorded and: { server.serverRunning }) {
			// Recorder.close is asynchronous. Wait for the server to close the WAV
			// before FFmpeg opens it for muxing.
			server.schedSync({ |condition|
				server.sync(condition);
				finishVideo.value
			})
		} {
			finishVideo.value
		};
		^this
	}

	stop {
		if(isPlaying and: { player.notNil }) {
			player.stop
		} {
			this.finish(\cancelled)
		};
		^this
	}

	cancel { ^this.stop }

	status {
		^(
			clipName: clipName,
			playerName: playerName,
			pending: isPending,
			playing: isPlaying,
			recording: isRecording,
			screenCapturing: screenRecorder !? _.isRecording,
			takeDirectory: recordingPath !? _.directory,
			audioPath: recordingPath !? _.audioPath,
			videoPath: recordingPath !? _.videoPath,
			metadataPath: recordingPath !? _.metadataPath
		)
	}
}
