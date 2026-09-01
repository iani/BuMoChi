BmcSonificationMapping {
	var <bone, <component, <control, <inputRange, <outputRange, <usesRate, <clip;
	var previousValue, previousTime;

	*new { |bone, component, control, inputRange = #[0, 1], outputRange = #[0, 1],
		usesRate = false, clip = true|
		^super.new.init(bone, component, control, inputRange, outputRange, usesRate, clip)
	}

	*absolute { |bone, component, control, inputRange = #[0, 1], outputRange = #[0, 1], clip = true|
		^this.new(bone, component, control, inputRange, outputRange, false, clip)
	}

	*rate { |bone, component, control, inputRange = #[-1, 1], outputRange = #[0, 1], clip = true|
		^this.new(bone, component, control, inputRange, outputRange, true, clip)
	}

	init { |argBone, argComponent, argControl, argInputRange, argOutputRange, argUsesRate, argClip|
		bone = argBone.asSymbol;
		component = argComponent.asSymbol;
		control = argControl.asSymbol;
		inputRange = argInputRange.asArray;
		outputRange = argOutputRange.asArray;
		usesRate = argUsesRate == true;
		clip = argClip == true;
		if(inputRange.size != 2 or: { outputRange.size != 2 }) {
			Error("BmcSonificationMapping ranges must contain two values").throw
		};
		^this
	}

	value { |frame, time|
		var transform = frame.pose[bone];
		var absolute, raw, elapsed;
		if(transform.isNil or: { transform.respondsTo(component).not }) {
			Error("Unknown Bmc sonification parameter %.%".format(bone, component)).throw
		};
		absolute = transform.perform(component).asFloat;
		time = time ?? { SystemClock.seconds };
		elapsed = if(previousTime.isNil) { 1 / 60 } { (time - previousTime).max(0.0001) };
		raw = if(usesRate) {
			if(previousValue.isNil) { 0.0 } { (absolute - previousValue) / elapsed }
		} {
			absolute
		};
		previousValue = absolute;
		previousTime = time;
		raw = raw.linlin(inputRange[0], inputRange[1], outputRange[0], outputRange[1]);
		^if(clip) { raw.clip(outputRange.minItem, outputRange.maxItem) } { raw }
	}

	reset {
		previousValue = nil;
		previousTime = nil;
		^this
	}
}
