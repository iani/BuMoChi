BmcFrame {
	var <protocolVersion, <avatar, <source, <frameID, <timestamp, <pose;

	*new { |avatar, source, frameID = 0, timestamp = 0.0, pose, protocolVersion = 1|
		^super.new.init(avatar, source, frameID, timestamp, pose, protocolVersion)
	}

	*fromOSC { |message|
		Bmc.validateMessage(message);
		^this.new(message[2], message[3], message[4], message[5], BmcPose.fromOSC(message), message[1])
	}

	init { |argAvatar, argSource, argFrameID, argTimestamp, argPose, argVersion|
		avatar = argAvatar;
		source = argSource;
		frameID = argFrameID;
		timestamp = argTimestamp;
		pose = argPose ?? { BmcPose.neutral };
		protocolVersion = argVersion;
		^this
	}

	asOSCMessage {
		^['/bunraku/vmc/frame', protocolVersion, avatar, source, frameID, timestamp]
		++ pose.asValues
	}

	withPose { |newPose|
		^this.class.new(avatar, source, frameID, timestamp, newPose, protocolVersion)
	}

	copy { ^this.withPose(pose.copy) }
}
