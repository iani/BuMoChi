BmcAvatar {
	var <avatarID, <avatarName, <referencePose, <currentPose, <currentFrame;
	var <output, <vmcPort, <wires;

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
	addWire { |wire| wires.add(wire); ^wire }
	removeWire { |wire| wires.remove(wire); ^wire }
	clearWires { wires.clear; ^this }

	receiveFrame { |frame, time|
		var typed, completedPose;
		typed = if(frame.isKindOf(BmcFrame)) { frame } { BmcFrame.fromOSC(frame) };
		completedPose = typed.pose.copy;
		completedPose.fillMissingFrom(currentPose);
		completedPose.fillMissingFrom(referencePose);
		currentPose = completedPose;
		// The destination avatar controls both routing and the avatar name
		// embedded in the outgoing frame. This permits a saved clip to be
		// assigned to another staged avatar during playback.
		// Keep the completed frame route-free so recordings remain portable.
		// Routing is attached only by send, at the final avatar boundary.
		currentFrame = typed.withoutRoute.withPose(completedPose).withAvatar(avatarName);
		this.changed(\completedFrame, currentFrame.asOSCMessage, time ?? { SystemClock.seconds });
		this.send(currentFrame);
		^currentFrame
	}

	receiveSourceFrame { |sourceFrame, time|
		var result, matching;
		matching = wires.select { |wire| wire.matches(sourceFrame) }.sortBy(\priority);
		if(matching.isEmpty) { ^nil };
		result = if(currentFrame.notNil) {
			currentFrame.asOSCMessage
		} {
			BmcFrame.new(avatarName, "bmc-reference", 0, 0.0, referencePose).asOSCMessage
		};
		matching.do { |wire| result = wire.apply(result, sourceFrame) };
		result[Bmc.messageAvatarIndex(result)] = avatarName.asString;
		^this.receiveFrame(result, time)
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
