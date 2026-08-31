BmcFrameSource {
	var <name, <source, <sourceAvatar, <mode, <bones;
	var <frame, <time, <enabled = true;

	*new { |name, source, sourceAvatar, mode = \overwrite, bones|
		^super.new.init(name, source, sourceAvatar, mode, bones)
	}

	init { |argName, argSource, argSourceAvatar, argMode, argBones|
		name = (argName ?? { "source_" ++ this.identityHash }).asSymbol;
		source = argSource;
		sourceAvatar = argSourceAvatar;
		mode = (argMode ?? { \overwrite }).asSymbol;
		if([\overwrite, \compose].includes(mode).not) {
			Error("Unsupported Bmc frame-source mode: %".format(mode)).throw
		};
		bones = if(argBones.isNil) { nil } { Bmc.normalizeBones(argBones) };
		if(mode == \compose and: { bones.isNil }) {
			Error("Bmc compose source requires a bone selection").throw
		};
		^this
	}

	enabled_ { |flag| enabled = flag.asBoolean; ^this }
	rule_ { |rule|
		if(rule.isNil or: { rule == \overwrite }) {
			mode = \overwrite;
			bones = nil;
		} {
			mode = \compose;
			bones = Bmc.normalizeBones(rule);
		};
		^this
	}

	matches { |inputFrame|
		var typed = if(inputFrame.isKindOf(BmcFrame)) { inputFrame } { BmcFrame.fromOSC(inputFrame) };
		^enabled
		and: { source.isNil or: { typed.source.asString == source.asString } }
		and: { sourceAvatar.isNil or: { typed.avatar.asString == sourceAvatar.asString } }
	}

	update { |inputFrame, inputTime|
		frame = if(inputFrame.isKindOf(BmcFrame)) { inputFrame.withoutRoute } {
			BmcFrame.fromOSC(inputFrame).withoutRoute
		};
		time = inputTime ?? { SystemClock.seconds };
		^this
	}

	applyTo { |baseFrame|
		if(enabled.not or: { frame.isNil }) { ^baseFrame };
		if(mode == \overwrite) { ^frame.copy };
		^BmcFrame.fromOSC(Bmc.combine(baseFrame.asOSCMessage, frame.asOSCMessage, bones))
	}
}
