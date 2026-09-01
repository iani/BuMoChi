BmcScreenRecorder {
	var <isStarting = false, <isRecording = false, <isStopping = false;
	var <error, <videoPath, <statePath, processID;
	var stopAfterStart = false, stopAction, stopAudioPath;

	*helperPath {
		var classDirectory = PathName(this.filenameSymbol.asString).pathOnly;
		^(classDirectory +/+ "../../PipelineApplications/bmc_screen_capture.py").standardizePath
	}

	start { |argVideoPath, argStatePath, display = "Capture screen 0", fps = 30.0|
		var command;
		if(isStarting or: { isRecording } or: { isStopping }) {
			Error("Bmc screen recorder is already active").throw
		};
		videoPath = argVideoPath.standardizePath;
		statePath = argStatePath.standardizePath;
		error = nil;
		stopAfterStart = false;
		stopAction = nil;
		stopAudioPath = nil;
		isStarting = true;
		command = [
			"/usr/bin/env", "python3", this.class.helperPath, "start",
			"--output", videoPath, "--state", statePath,
			"--display", display, "--fps", fps.asString
		];
		processID = command.unixCmd({ |exitCode|
			isStarting = false;
			if(exitCode == 0) {
				isRecording = true;
				"Bmc screen recording started: %".format(videoPath).postln;
				if(stopAfterStart) {
					stopAfterStart = false;
					this.stop(stopAction, stopAudioPath)
				}
			} {
				error = "Screen capture helper exited with status %".format(exitCode);
				error.warn;
				if(stopAfterStart) {
					stopAfterStart = false;
					stopAction.value(false)
				}
			}
		}, false);
		^this
	}

	stop { |action, audioPath|
		var command;
		if(isStarting) {
			stopAfterStart = true;
			stopAction = action;
			stopAudioPath = audioPath;
			"Bmc screen recording will stop after startup completes.".postln;
			^this
		};
		if(isRecording.not) {
			"Bmc screen recording is not active.".postln;
			action.value(false);
			^this
		};
		isStopping = true;
		command = [
			"/usr/bin/env", "python3", this.class.helperPath, "stop",
			"--state", statePath
		];
		if(audioPath.notNil) { command = command ++ ["--audio", audioPath.standardizePath] };
		processID = command.unixCmd({ |exitCode|
			isStopping = false;
			isRecording = false;
			if(exitCode != 0) {
				error = "Screen capture stop helper exited with status %".format(exitCode);
				error.warn
			} {
				"Bmc screen recording stopped: %".format(videoPath).postln
			};
			stopAction = nil;
			stopAudioPath = nil;
			action.value(exitCode == 0)
		}, false);
		^this
	}

	status {
		^(
			starting: isStarting,
			recording: isRecording,
			stopping: isStopping,
			videoPath: videoPath,
			error: error
		)
	}
}
