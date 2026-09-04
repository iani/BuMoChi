BmcClipPlayer {
	var <clip, <output, <avatar, <compositionRule = \overwrite;
	var <task, <currentIndex = 0, <name;
	var <rate = 1.0, <looping = false, <isPlaying = false, <isPaused = false;
	var <isMuted = false;
	var <startFrame = 0, <endFrame;

	*new { |clip, output, name| ^super.new.init(clip, output, name) }

	init { |argClip, argOutput, argName|
		clip = argClip;
		output = argOutput;
		avatar = if(argOutput.isKindOf(BmcAvatar)) { argOutput } { nil };
		name = argName;
		endFrame = if(clip.isNil or: { clip.isEmpty }) { nil } { clip.size - 1 };
		^this
	}

	clip_ { |newClip|
		this.stop;
		clip = newClip;
		startFrame = 0;
		endFrame = if(clip.isNil or: { clip.isEmpty }) { nil } { clip.size - 1 };
		currentIndex = startFrame;
		^clip
	}
	output_ { |newOutput|
		if(avatar.notNil and: { avatar !== newOutput } and: { name.notNil }) {
			avatar.removeSourceNamed(name)
		};
		output = newOutput;
		avatar = if(newOutput.isKindOf(BmcAvatar)) { newOutput } { nil };
		^output
	}
	compositionRule_ { |rule|
		compositionRule = if(rule.isNil or: { rule == \overwrite }) {
			\overwrite
		} {
			Bmc.normalizeBones(rule)
		};
		^compositionRule
	}
	rate_ { |newRate|
		newRate = newRate.asFloat;
		if(newRate.abs > 100) { Error("BmcClipPlayer rate must be between -100 and 100").throw };
		rate = newRate;
	}
	loop_ { |flag| looping = flag.asBoolean }
	startFrame_ { |index|
		if(clip.isNil or: { clip.isEmpty }) {
			startFrame = index.asInteger.max(0);
			currentIndex = startFrame;
			^startFrame
		};
		startFrame = index.asInteger.clip(0, clip.size - 1);
		if(endFrame.isNil or: { endFrame < startFrame }) { endFrame = startFrame };
		currentIndex = currentIndex.clip(startFrame, endFrame);
		^startFrame
	}
	endFrame_ { |index|
		if(clip.isNil or: { clip.isEmpty }) { endFrame = index; ^endFrame };
		endFrame = (index ?? { clip.size - 1 }).asInteger.clip(startFrame, clip.size - 1);
		currentIndex = currentIndex.clip(startFrame, endFrame);
		^endFrame
	}
	range_ { |start = 0, end|
		if(clip.isNil or: { clip.isEmpty }) { Error("BmcClipPlayer has no clip to range").throw };
		startFrame = start.asInteger.clip(0, clip.size - 1);
		endFrame = (end ?? { clip.size - 1 }).asInteger.clip(startFrame, clip.size - 1);
		currentIndex = currentIndex.clip(startFrame, endFrame);
		^this
	}

	play { |startIndex| ^this.playAt(SystemClock.seconds, startIndex) }

	playAt { |startTime, startIndex|
		if(clip.isNil or: { clip.isEmpty }) { Error("BmcClipPlayer has no clip to play").throw };
		this.stop;
		startTime = startTime ?? { SystemClock.seconds };
		currentIndex = startIndex ?? {
			if(rate < 0) { endFrame } { currentIndex }
		};
		currentIndex = currentIndex.clip(startFrame, endFrame);
		if(rate == 0) {
			this.previewCurrentFrame;
			this.changed(\end);
			^this
		};
		isPlaying = true;
		isPaused = false;
		task = Task({
			var waitTime;
			(startTime - SystemClock.seconds).max(0.0).wait;
			while { isPlaying } {
				this.send(clip.frameAt(currentIndex));
				this.changed(\frame, currentIndex, clip.frameAt(currentIndex));
				if((rate > 0 and: { currentIndex >= endFrame }) or: {
					rate < 0 and: { currentIndex <= startFrame }
				}) {
					if(looping) {
						currentIndex = if(rate > 0) { startFrame } { endFrame }
					} {
						isPlaying = false
					};
				} {
					if(rate > 0) {
						waitTime = (clip.timeAt(currentIndex + 1) - clip.timeAt(currentIndex)) / rate;
						currentIndex = currentIndex + 1
					} {
						waitTime = (clip.timeAt(currentIndex) - clip.timeAt(currentIndex - 1)) / rate.abs;
						currentIndex = currentIndex - 1
					};
					waitTime.max(0.0).wait;
				};
			};
			this.changed(\end);
		}, SystemClock);
		task.start(SystemClock);
		^this
	}

	send { |message|
		if(isMuted) { ^this };
		if(output.isNil) { ^this };
		if(output.isKindOf(Function)) { output.value(message); ^this };
		if(output.isKindOf(NetAddr)) { output.sendMsg(*message); ^this };
		if(output.respondsTo(\receiveFrame)) {
			output.receiveFrame(message, nil, this, compositionRule);
			^this
		};
		Error("Unsupported BmcClipPlayer output: %".format(output)).throw;
	}

	pause {
		if(task.notNil and: { isPlaying } and: { isPaused.not }) {
			task.pause;
			isPaused = true;
		};
		^this
	}
	freeze { ^this.pause }
	resume {
		if(task.notNil and: { isPlaying } and: { isPaused }) {
			task.resume;
			isPaused = false;
		};
		^this
	}
	mute {
		isMuted = true;
		if(avatar.notNil and: { name.notNil }) {
			avatar.removeSourceNamed(name)
		};
		^this
	}
	unmute { isMuted = false; ^this }
	stop {
		var wasPlaying = isPlaying;
		isPlaying = false;
		isPaused = false;
		if(task.notNil) { task.stop; task = nil };
		// Stopping relinquishes this player's composition authority. The player
		// remains registered and reusable; its next frame recreates a newest-first
		// cache. Freeze is the operation that deliberately retains the held cache.
		if(avatar.notNil and: { name.notNil }) {
			avatar.removeSourceNamed(name)
		};
		if(wasPlaying) { this.changed(\end) };
		^this
	}
	restart { ^this.play(startFrame) }
	reset {
		this.stop;
		currentIndex = startFrame;
		^this
	}

	previewCurrentFrame {
		var frame;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		frame = clip.frameAt(currentIndex);
		this.send(frame);
		this.changed(\frame, currentIndex, frame);
		^this
	}

	seekFrame { |frameIndex, preview = true|
		var wasPlaying = isPlaying, wasPaused = isPaused;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		currentIndex = frameIndex.asInteger.clip(startFrame, endFrame);
		if(wasPlaying and: { wasPaused.not }) {
			this.play(currentIndex)
		} {
			if(preview) { this.previewCurrentFrame }
		};
		^this
	}

	seekTime { |seconds, preview = true|
		var low = 0, high, middle, found = 0;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		high = clip.size - 1;
		while { low <= high } {
			middle = ((low + high) / 2).floor.asInteger;
			if(clip.timeAt(middle) <= seconds) {
				found = middle;
				low = middle + 1
			} {
				high = middle - 1
			}
		};
		^this.seekFrame(found, preview)
	}

	stepFrames { |amount = 1, preview = true|
		^this.seekFrame(currentIndex + amount.asInteger, preview)
	}

	seek { |seconds| ^this.seekTime(seconds) }
}
