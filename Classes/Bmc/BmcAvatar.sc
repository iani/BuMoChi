BmcAvatar {
	var <avatarID, <avatarName, <referencePose, <currentPose, <currentFrame;
	var <output, <wires;

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
		currentFrame = typed.withPose(completedPose);
		this.changed(\completedFrame, currentFrame.asOSCMessage, time ?? { SystemClock.seconds });
		this.send(currentFrame.asOSCMessage);
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
		result[2] = avatarName.asString;
		^this.receiveFrame(result, time)
	}

	send { |message|
		if(output.isNil) { ^this };
		if(output.isKindOf(Function)) { output.value(message); ^this };
		if(output.isKindOf(NetAddr)) { output.sendMsg(*message); ^this };
		Error("Unsupported BmcAvatar output: %".format(output)).throw;
	}
}
