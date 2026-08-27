// Records validated Bunraku Frame messages into a route-free BmcMocapClip.
//
// A dispatcher or avatar may publish frames with changed(capturePoint, frame,
// time). The default capture point is \rawFrame; use \completedFrame when the
// recorder is attached after reference-pose / hold-last-value completion.

BmcClipRecorder {
	var <entries, <isRecording = false, <capturePoint;
	var <avatar, <source, <startedAt, <stoppedAt, <metadata;

	*new { ^super.new.init }

	init {
		entries = List.new;
		capturePoint = \rawFrame;
		metadata = ();
		^this
	}

	record { |argAvatar, argSource, argCapturePoint = \rawFrame, argMetadata|
		if(isRecording) {
			Error("BmcClipRecorder is already recording").throw;
		};
		if([\rawFrame, \completedFrame].includes(argCapturePoint).not) {
			Error("BmcClipRecorder: capturePoint must be \\rawFrame or \\completedFrame").throw;
		};

		avatar = argAvatar;
		source = argSource;
		capturePoint = argCapturePoint;
		metadata = (argMetadata ?? { () }).copy;
		entries = List.new;
		startedAt = nil;
		stoppedAt = nil;
		isRecording = true;
		^this
	}

	addFrame { |frame, time|
		var recordedFrame;
		if(isRecording.not) { ^false };
		Bmc.validateMessage(frame, "recorded frame");
		// Routes are transmission metadata, never clip data. Normalize even an
		// accidentally routed input frame back to the route-free representation.
		recordedFrame = BmcFrame.fromOSC(frame).withoutRoute.asOSCMessage;
		if(avatar.notNil and: {
			recordedFrame[Bmc.messageAvatarIndex(recordedFrame)].asString != avatar.asString
		}) { ^false };
		if(source.notNil and: {
			recordedFrame[Bmc.messageSourceIndex(recordedFrame)].asString != source.asString
		}) { ^false };

		time = time ?? { SystemClock.seconds };
		startedAt = startedAt ?? { time };
		entries.add([time - startedAt, recordedFrame]);
		^true
	}

	// Dependants receive: publisher, change symbol, frame, capture time.
	update { |theChanger, what, frame, time|
		if(isRecording and: { what == capturePoint } and: { frame.notNil }) {
			this.addFrame(frame, time);
		};
	}

	stop {
		var clip;
		if(isRecording.not) {
			Error("BmcClipRecorder is not recording").throw;
		};
		isRecording = false;
		stoppedAt = SystemClock.seconds;
		clip = BmcMocapClip(entries.asArray, metadata.copy.putAll((
			capturePoint: capturePoint,
			avatarFilter: avatar,
			sourceFilter: source,
			startedAt: startedAt,
			stoppedAt: stoppedAt
		)));
		^clip
	}

	cancel {
		isRecording = false;
		entries = List.new;
		startedAt = nil;
		stoppedAt = SystemClock.seconds;
		^this
	}

	size { ^entries.size }
}
