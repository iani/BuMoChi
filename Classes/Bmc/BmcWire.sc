BmcWire {
	var <source, <sourceAvatar, <targetAvatar, <bones, <priority, <enabled = true;

	*new { |source, sourceAvatar, targetAvatar, bones, priority = 0|
		^super.new.init(source, sourceAvatar, targetAvatar, bones, priority)
	}

	init { |argSource, argSourceAvatar, argTargetAvatar, argBones, argPriority|
		source = argSource;
		sourceAvatar = argSourceAvatar;
		targetAvatar = argTargetAvatar;
		bones = Bmc.normalizeBones(argBones);
		priority = argPriority;
		^this
	}

	enabled_ { |flag| enabled = flag.asBoolean }

	matches { |frame|
		frame = if(frame.isKindOf(BmcFrame)) { frame.asOSCMessage } { frame };
		^enabled
		and: { source.isNil or: { frame[3].asString == source.asString } }
		and: { sourceAvatar.isNil or: { frame[2].asString == sourceAvatar.asString } }
	}

	apply { |targetFrame, sourceFrame|
		if(this.matches(sourceFrame).not) { ^targetFrame };
		^Bmc.combine(targetFrame, sourceFrame, bones)
	}
}
