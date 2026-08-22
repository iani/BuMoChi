BmcClipPlayer {
	var <clip, <output, <task, <currentIndex = 0;
	var <rate = 1.0, <looping = false, <isPlaying = false, <isPaused = false;

	*new { |clip, output| ^super.new.init(clip, output) }

	init { |argClip, argOutput|
		clip = argClip;
		output = argOutput;
		^this
	}

	clip_ { |newClip| this.stop; clip = newClip; currentIndex = 0 }
	output_ { |newOutput| output = newOutput }
	rate_ { |newRate|
		if(newRate <= 0) { Error("BmcClipPlayer rate must be greater than zero").throw };
		rate = newRate;
	}
	loop_ { |flag| looping = flag.asBoolean }

	play { |startIndex|
		if(clip.isNil or: { clip.isEmpty }) { Error("BmcClipPlayer has no clip to play").throw };
		this.stop;
		currentIndex = startIndex ?? { currentIndex };
		currentIndex = currentIndex.clip(0, clip.size - 1);
		isPlaying = true;
		isPaused = false;
		task = Task({
			var waitTime;
			while { isPlaying } {
				this.send(clip.frameAt(currentIndex));
				this.changed(\frame, currentIndex, clip.frameAt(currentIndex));
				if(currentIndex >= (clip.size - 1)) {
					if(looping) { currentIndex = 0 } { isPlaying = false };
				} {
					waitTime = (clip.timeAt(currentIndex + 1) - clip.timeAt(currentIndex)) / rate;
					currentIndex = currentIndex + 1;
					waitTime.max(0.0).wait;
				};
			};
			this.changed(\end);
		});
		task.start;
		^this
	}

	send { |message|
		if(output.isNil) { ^this };
		if(output.isKindOf(Function)) { output.value(message); ^this };
		if(output.isKindOf(NetAddr)) { output.sendMsg(*message); ^this };
		if(output.respondsTo(\receiveFrame)) { output.receiveFrame(message); ^this };
		Error("Unsupported BmcClipPlayer output: %".format(output)).throw;
	}

	pause { if(task.notNil) { task.pause; isPaused = true } }
	resume { if(task.notNil) { task.resume; isPaused = false } }
	stop {
		isPlaying = false;
		isPaused = false;
		if(task.notNil) { task.stop; task = nil };
		^this
	}

	seek { |seconds|
		var found = 0;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		clip.entries.do { |entry, index| if(entry[0] <= seconds) { found = index } };
		currentIndex = found;
		^this
	}
}
