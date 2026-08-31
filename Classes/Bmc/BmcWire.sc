// Compatibility name for a cached, partial-body frame source.
BmcWire : BmcFrameSource {
	var <targetAvatar, <priority;

	*new { |source, sourceAvatar, targetAvatar, bones, priority = 0|
		^super.new.initWire(source, sourceAvatar, targetAvatar, bones, priority)
	}

	initWire { |argSource, argSourceAvatar, argTargetAvatar, argBones, argPriority|
		var wireName = (
			"wire_" ++ argTargetAvatar.asString ++ "_" ++ this.identityHash
		).asSymbol;
		super.init(wireName, argSource, argSourceAvatar, \compose, argBones);
		targetAvatar = argTargetAvatar;
		priority = argPriority;
		^this
	}

	// Legacy one-shot API. Cached avatar composition uses update/applyTo.
	apply { |targetFrame, sourceFrame|
		if(this.matches(sourceFrame).not) { ^targetFrame };
		this.update(sourceFrame);
		^this.applyTo(BmcFrame.fromOSC(targetFrame)).asOSCMessage
	}
}
