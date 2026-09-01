BmcPositionModifier {
	var <name, <position, <mode = \replace, <enabled = true;

	*new { |name, position, mode = \replace|
		^super.new.init(name, position, mode)
	}

	init { |argName, argPosition, argMode|
		name = (argName ?? { "positionModifier_" ++ this.identityHash }).asSymbol;
		this.mode_(argMode);
		this.position_(argPosition);
		^this
	}

	position_ { |value|
		if(value.isKindOf(Function).not) { this.validatePosition(value) };
		position = value;
		^this
	}

	mode_ { |value|
		value = (value ?? { \replace }).asSymbol;
		if([\replace, \add].includes(value).not) {
			Error("Unsupported Bmc position-modifier mode: %".format(value)).throw
		};
		mode = value;
		^this
	}

	enabled_ { |flag| enabled = flag.asBoolean; ^this }

	valueAt { |time, frame|
		var value = if(position.isKindOf(Function)) {
			position.value(time, frame, this)
		} {
			position
		};
		this.validatePosition(value);
		^value
	}

	applyTo { |frame, time|
		var pose, hips, value;
		if(enabled.not) { ^frame };
		value = this.valueAt(time ?? { SystemClock.seconds }, frame);
		pose = frame.pose.copy;
		hips = pose.at(\Hips).asArray;
		3.do { |index|
			if(value[index].notNil) {
				hips[index] = if(mode == \add) {
					hips[index] + value[index]
				} {
					value[index]
				};
			};
		};
		pose.put(\Hips, hips);
		^frame.withPose(pose)
	}

	validatePosition { |value|
		if(value.isSequenceableCollection.not or: { value.size != 3 }) {
			Error("BmcPositionModifier requires [x, y, z]; nil preserves an axis").throw
		};
		value.do { |item|
			if(item.notNil and: { item.isNumber.not }) {
				Error("BmcPositionModifier coordinates must be numbers or nil").throw
			};
		};
		^value
	}
}
