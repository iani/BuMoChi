BmcFrame {
	var <protocolVersion, <avatar, <source, <frameID, <timestamp, <pose, <targetPort, <extension;

	*new { |avatar, source, frameID = 0, timestamp = 0.0, pose, protocolVersion = 1, targetPort, extension|
		^super.new.init(avatar, source, frameID, timestamp, pose, protocolVersion, targetPort, extension)
	}

	*fromOSC { |message|
		var version;
		Bmc.validateMessage(message);
		version = message[1].asInteger;
		^if([2, 4].includes(version)) {
			this.new(message[3], message[4], message[5], message[6],
				BmcPose.fromOSC(message), version, message[2].asInteger,
				if(version == 4) { message.copyRange(154, message.size - 1) } { #[] })
		} {
			this.new(message[2], message[3], message[4], message[5],
				BmcPose.fromOSC(message), version, nil,
				if(version == 3) { message.copyRange(153, message.size - 1) } { #[] })
		}
	}

	init { |argAvatar, argSource, argFrameID, argTimestamp, argPose, argVersion, argTargetPort, argExtension|
		avatar = argAvatar;
		source = argSource;
		frameID = argFrameID;
		timestamp = argTimestamp;
		pose = argPose ?? { BmcPose.neutral };
		targetPort = argTargetPort;
		extension = argExtension ?? { #[] };
		protocolVersion = if(extension.isEmpty) {
			if(targetPort.isNil) { 1 } { 2 }
		} {
			if(targetPort.isNil) { 3 } { 4 }
		};
		^this
	}

	asOSCMessage {
		if(targetPort.notNil) {
			^['/bunraku/vmc/frame', protocolVersion, targetPort, avatar, source, frameID, timestamp]
			++ pose.asValues ++ extension
		};
		^['/bunraku/vmc/frame', protocolVersion, avatar, source, frameID, timestamp]
		++ pose.asValues ++ extension
	}

	withPose { |newPose|
		^this.class.new(avatar, source, frameID, timestamp, newPose, protocolVersion, targetPort, extension.copy)
	}

	withAvatar { |newAvatar|
		^this.class.new(newAvatar, source, frameID, timestamp, pose.copy, protocolVersion, targetPort, extension.copy)
	}

	withTargetPort { |port|
		port = port.asInteger;
		if((port < 1) or: { port > 65535 }) {
			Error("Invalid routed VMC target port: %".format(port)).throw;
		};
		^this.class.new(avatar, source, frameID, timestamp, pose.copy,
			if(extension.isEmpty) { 2 } { 4 }, port, extension.copy)
	}

	withoutRoute {
		^this.class.new(avatar, source, frameID, timestamp, pose.copy,
			if(extension.isEmpty) { 1 } { 3 }, nil, extension.copy)
	}

	copy { ^this.withPose(pose.copy) }
}
