BmcTakeMetadata {
	var <path, <data, startedAt;

	*new { |pathSpec, clipName, playerName, clip, startFrame, endFrame, rate, loop,
		interpreterCode, sonificationDescription|
		^super.new.init(pathSpec, clipName, playerName, clip, startFrame, endFrame,
			rate, loop, interpreterCode, sonificationDescription)
	}

	init { |pathSpec, clipName, playerName, clip, startFrame, endFrame, rate, loop,
		interpreterCode, sonificationDescription|
		var sourceDuration, expectedDuration;
		path = pathSpec.metadataPath;
		startedAt = SystemClock.seconds;
		sourceDuration = (clip.timeAt(endFrame) - clip.timeAt(startFrame)).max(0.0);
		expectedDuration = if(loop) { nil } { sourceDuration / rate };
		data = (
			format: \bmcAudioVideoTake,
			formatVersion: 1,
			status: \preparing,
			takeName: pathSpec.basename.asSymbol,
			createdAt: Date.localtime.asString,
			sourceClip: clipName.asSymbol,
			playerName: playerName.asSymbol,
			playback: (
				startFrame: startFrame,
				endFrame: endFrame,
				speed: rate,
				loop: loop,
				sourceDuration: sourceDuration,
				duration: expectedDuration
			),
			files: (
				audio: PathName(pathSpec.audioPath).fileName,
				video: PathName(pathSpec.videoPath).fileName
			),
			interpreterCode: interpreterCode,
			sonificationDescription: sonificationDescription
		);
		this.write;
		^this
	}

	status_ { |value|
		data[\status] = value;
		if(value == \recording) { startedAt = SystemClock.seconds };
		this.write;
		^value
	}

	finish { |status = \complete, audioRecorded = false, videoRecorded = false,
		videoHasAudio = false|
		data[\status] = status;
		data[\actualDuration] = SystemClock.seconds - startedAt;
		data[\audioRecorded] = audioRecorded;
		data[\videoRecorded] = videoRecorded;
		data[\videoHasAudio] = videoHasAudio;
		this.write;
		^this
	}

	write {
		var file = File(path, "w");
		if(file.isOpen.not) { Error("Could not write Bmc take metadata: %".format(path)).throw };
		protect {
			file.putString(data.asCompileString);
			file.putString("\n");
		} {
			file.close
		};
		^path
	}
}
