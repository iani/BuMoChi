BmcFrame {
	var <protocolVersion, <avatar, <source, <frameID, <timestamp, <pose, <targetPort;

	*new { |avatar, source, frameID = 0, timestamp = 0.0, pose, protocolVersion = 1, targetPort|
		^super.new.init(avatar, source, frameID, timestamp, pose, protocolVersion, targetPort)
	}

	*fromOSC { |message|
		var version;
		Bmc.validateMessage(message);
		version = message[1].asInteger;
		^if(version == 2) {
			this.new(message[3], message[4], message[5], message[6],
				BmcPose.fromOSC(message), version, message[2].asInteger)
		} {
			this.new(message[2], message[3], message[4], message[5],
				BmcPose.fromOSC(message), version)
		}
	}

	init { |argAvatar, argSource, argFrameID, argTimestamp, argPose, argVersion, argTargetPort|
		avatar = argAvatar;
		source = argSource;
		frameID = argFrameID;
		timestamp = argTimestamp;
		pose = argPose ?? { BmcPose.neutral };
		targetPort = argTargetPort;
		protocolVersion = if(targetPort.isNil) { argVersion ?? { 1 } } { 2 };
		^this
	}

	asOSCMessage {
		if(targetPort.notNil) {
			^['/bunraku/vmc/frame', 2, targetPort, avatar, source, frameID, timestamp]
			++ pose.asValues
		};
		^['/bunraku/vmc/frame', protocolVersion, avatar, source, frameID, timestamp]
		++ pose.asValues
	}

	withPose { |newPose|
		^this.class.new(avatar, source, frameID, timestamp, newPose, protocolVersion, targetPort)
	}

	withAvatar { |newAvatar|
		^this.class.new(newAvatar, source, frameID, timestamp, pose.copy, protocolVersion, targetPort)
	}

	withTargetPort { |port|
		port = port.asInteger;
		if((port < 1) or: { port > 65535 }) {
			Error("Invalid routed VMC target port: %".format(port)).throw;
		};
		^this.class.new(avatar, source, frameID, timestamp, pose.copy, 2, port)
	}

	withoutRoute {
		^this.class.new(avatar, source, frameID, timestamp, pose.copy, 1)
	}

	copy { ^this.withPose(pose.copy) }
}
