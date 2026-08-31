BmcCompositor {
	var avatarProvider, <rate = 60.0, <task, <isRunning = false;
	var <tickCount = 0, <frameCount = 0;

	*new { |avatarProvider, rate = 60.0|
		^super.new.init(avatarProvider, rate)
	}

	init { |argAvatarProvider, argRate|
		avatarProvider = argAvatarProvider;
		this.rate_(argRate);
		^this
	}

	rate_ { |newRate|
		newRate = newRate.asFloat;
		if(newRate <= 0) { Error("BmcCompositor rate must be greater than zero").throw };
		rate = newRate;
		^rate
	}

	avatars {
		var result = if(avatarProvider.isKindOf(Function)) {
			avatarProvider.value
		} {
			avatarProvider
		};
		^(result ?? { #[] }).asArray
	}

	start {
		if(isRunning) { ^this };
		isRunning = true;
		task = Routine({
			var nextTick = SystemClock.seconds;
			while { isRunning } {
				this.tick(nextTick);
				nextTick = nextTick + rate.reciprocal;
				// Drop missed ticks rather than emitting a catch-up burst.
				if(nextTick < SystemClock.seconds) { nextTick = SystemClock.seconds };
				(nextTick - SystemClock.seconds).max(0.0).wait;
			};
		}).play(SystemClock);
		^this
	}

	stop {
		isRunning = false;
		if(task.notNil) { task.stop; task = nil };
		^this
	}

	tick { |sampleTime|
		tickCount = tickCount + 1;
		sampleTime = sampleTime ?? { SystemClock.seconds };
		this.avatars.do { |avatar|
			if(avatar.shouldSample) {
				avatar.sampleAndSend(sampleTime);
				frameCount = frameCount + 1;
			};
		};
		^this
	}

	status {
		^(running: isRunning, rate: rate, ticks: tickCount, frames: frameCount)
	}
}
