BmcAvatar {
	var <avatarID, <avatarName, <referencePose, <currentPose, <currentFrame;
	var <output, <vmcPort, <wires, <dirty = false;

	*new { |avatarID, avatarName| ^super.new.init(avatarID, avatarName) }

	init { |argAvatarID, argAvatarName|
		avatarID = argAvatarID ?? { \default };
		avatarName = argAvatarName ?? { avatarID.asString };
		referencePose = BmcPose.neutral;
		currentPose = referencePose.copy;
		wires = List.new;
		^this
	}

	referencePose_ { |pose| referencePose = pose.copy; ^this }
	output_ { |destination| output = destination; ^this }
	vmcPort_ { |port|
		if(port.isNil) { vmcPort = nil; ^this };
		port = port.asInteger;
		if((port < 1) or: { port > 65535 }) {
			Error("Invalid avatar VMC destination port: %".format(port)).throw;
		};
		vmcPort = port;
		^this
	}
	// Newest source is first. Composition evaluates in reverse so index zero
	// has final authority over every older cache.
	addWire { |wire| wires.insert(0, wire); dirty = true; ^wire }
	removeWire { |wire|
		if(wires.remove(wire).notNil) { dirty = true };
		^wire
	}
	clearWires {
		wires.clear;
		dirty = true;
		^this
	}
	sources { ^wires.copy }
	addSource { |sourceCache| ^this.addWire(sourceCache) }
	removeSource { |sourceCache| ^this.removeWire(sourceCache) }
	clearSources { ^this.clearWires }
	removeSourceNamed { |sourceName|
		var cache = wires.detect { |item| item.name == sourceName.asSymbol };
		if(cache.notNil) { this.removeWire(cache) };
		^cache
	}

	receiveFrame { |frame, time, sourceObject, compositionRule = \overwrite|
		var typed = if(frame.isKindOf(BmcFrame)) { frame } { BmcFrame.fromOSC(frame) };
		var selectorSource;
		var key = if(sourceObject.notNil and: { sourceObject.respondsTo(\name) }) {
			sourceObject.name
		} {
			("direct_" ++ typed.source.asString ++ "_" ++ typed.avatar.asString).asSymbol
		};
		var cache = wires.detect { |item| item.name == key };
		if(cache.isNil) {
			selectorSource = if(sourceObject.isNil) {
				typed.source
			} {
				("__player_" ++ key.asString)
			};
			cache = BmcFrameSource(key, selectorSource, typed.avatar, \overwrite);
			this.addWire(cache);
		};
		cache.rule_(compositionRule);
		cache.update(typed, time);
		dirty = true;
		^cache
	}

	composeFrame { |time|
		var result = BmcFrame.new(avatarName, "bmc-reference", 0, 0.0, referencePose);
		var completedPose;
		wires.reverse.do { |sourceCache| result = sourceCache.applyTo(result) };
		completedPose = result.pose.copy;
		completedPose.fillMissingFrom(referencePose);
		currentPose = completedPose;
		// The destination avatar controls both routing and the avatar name
		// embedded in the outgoing frame. This permits a saved clip to be
		// assigned to another staged avatar during playback.
		// Keep the completed frame route-free so recordings remain portable.
		// Routing is attached only by send, at the final avatar boundary.
		currentFrame = result.withoutRoute.withPose(completedPose).withAvatar(avatarName);
		^currentFrame
	}

	shouldSample { ^wires.notEmpty or: { dirty } }

	sampleAndSend { |time|
		var frame = this.composeFrame(time);
		this.changed(\completedFrame, frame.asOSCMessage, time ?? { SystemClock.seconds });
		this.send(frame);
		dirty = false;
		^frame
	}

	// Explicit compatibility/manual operation. Normal output is clocked by
	// BmcCompositor rather than triggered by source updates.
	composeAndSend { |time| ^this.sampleAndSend(time) }

	receiveSourceFrame { |sourceFrame, time|
		var typed = if(sourceFrame.isKindOf(BmcFrame)) { sourceFrame } { BmcFrame.fromOSC(sourceFrame) };
		var matching = wires.select { |sourceCache| sourceCache.matches(typed) };
		var direct = (typed.avatar.asString == avatarID.asString)
		or: { typed.avatar.asString == avatarName.asString };
		if(matching.isEmpty and: { direct.not }) { ^nil };
		if(matching.isEmpty and: { direct }) { ^this.receiveFrame(typed, time) };
		matching.do { |sourceCache| sourceCache.update(typed, time) };
		dirty = true;
		^matching
	}

	send { |frame|
		var message = if(frame.isKindOf(BmcFrame)) {
			if(vmcPort.isNil) { frame.asOSCMessage } { frame.withTargetPort(vmcPort).asOSCMessage }
		} {
			if(vmcPort.isNil) { frame } { BmcFrame.fromOSC(frame).withoutRoute.withTargetPort(vmcPort).asOSCMessage }
		};
		this.sendTo(output, message);
		^this
	}

	sendTo { |destination, message|
		if(destination.isNil) { ^this };
		if(destination.isKindOf(Function)) { destination.value(message); ^this };
		if(destination.isKindOf(NetAddr)) { destination.sendMsg(*message); ^this };
		if(destination.isKindOf(Collection)) {
			destination.do { |item| this.sendTo(item, message) };
			^this
		};
		Error("Unsupported BmcAvatar output: %".format(destination)).throw;
	}
}
