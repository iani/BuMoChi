BunrakuOSCDecoderTest {
	var <destination, <targetPort, <frameRate, <duration, <poseMode;
	var <task, <isRunning, <framesSent;

	*new { |inputPort = 39538, avatarPort, frameRate = 60, duration = 60.0, pose = \rest, host = "127.0.0.1"|
		^super.new.init(host, inputPort, avatarPort, frameRate, duration, pose)
	}

	init { |host, inputPort, avatarPort, argFrameRate, argDuration, argPose|
		inputPort = this.validPort(inputPort, "decoder input");
		targetPort = avatarPort ?? {
			if(Bmc.defaultAvatar.isNil) { nil } { Bmc.defaultAvatar.vmcPort }
		};
		if(targetPort.isNil) {
			Error("BunrakuOSCDecoder test requires an avatar VMC destination port").throw
		};
		targetPort = this.validPort(targetPort, "Godot VMC destination");
		frameRate = argFrameRate.asFloat;
		duration = argDuration.asFloat;
		if(frameRate <= 0) { Error("BunrakuOSCDecoder test frame rate must be positive").throw };
		if(duration <= 0) { Error("BunrakuOSCDecoder test duration must be positive").throw };
		poseMode = argPose.asSymbol;
		if(#[rest, calibration].includes(poseMode).not) {
			Error("BunrakuOSCDecoder test pose must be \\rest or \\calibration").throw
		};
		destination = NetAddr(host.asString, inputPort);
		framesSent = 0;
		isRunning = false;
		this.start;
		^this
	}

	validPort { |port, label|
		port = port.asInteger;
		if((port < 1) or: { port > 65535 }) {
			Error("Invalid BunrakuOSCDecoder test % port: %".format(label, port)).throw
		};
		^port
	}

	start {
		var frameCount;
		if(isRunning) { ^this };
		frameCount = (frameRate * duration).round.asInteger.max(1);
		isRunning = true;
		task = Task({
			frameCount.do { |frameIndex|
				if(isRunning.not) { task.stop };
				this.sendFrame(frameIndex);
				framesSent = framesSent + 1;
				frameRate.reciprocal.wait;
			};
			isRunning = false;
		}, SystemClock).play;
		^this
	}

	stop {
		isRunning = false;
		if(task.notNil) { task.stop };
		^this
	}

	sendFrame { |frameIndex|
		var elapsed = frameIndex / frameRate;
		var phase = elapsed * 2pi * 0.25;
		var pose = this.testPose;
		var hips = pose.at(\Hips).asArray;
		var frame;
		hips[0] = hips[0] + (sin(phase) * 0.08);
		pose.put(\Hips, hips);
		frame = BmcFrame(
			Bmc.defaultAvatar.avatarName,
			"bmc-decoder-test",
			frameIndex,
			elapsed,
			pose
		).withTargetPort(targetPort);
		destination.sendMsg(*frame.asOSCMessage);
		^frame
	}

	testPose {
		if(poseMode == \calibration) { ^Bmc.calibrationFrame.pose.copy };
		^this.ishidomaruRestPose
	}

	ishidomaruRestPose {
		var pose = BmcPose.neutral;
		var transforms = IdentityDictionary[
			// Preserve the valid recorded joint pose, but normalize its absolute
			// XR-Animator root translation to this Godot project's visible stage.
			\Hips -> [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0],
			// Use Ishidomaru-derived torso lengths and an upright rotation basis.
			// The recorded source frame had a very compressed torso chain, which
			// pulled the chest, neck, shoulders, and head into a hunched posture.
			\Spine -> [0.0, 0.06031519, 0.01449928, 0.0, 0.0, 0.0, 1.0],
			\Chest -> [0.0, 0.20000000, -0.01343284, 0.0, 0.0, 0.0, 1.0],
			\Neck -> [0.0, 0.17000000, -0.04442924, 0.0, 0.0, 0.0, 1.0],
			\Head -> [0.0, 0.10500000, 0.01218641, 0.0, 0.0, 0.0, 1.0],
			\LeftShoulder -> [-0.01643331, 0.13716209, -0.02260794, 0.0, 0.0, 0.10603762, 0.99436212],
			\LeftUpperArm -> [-0.05430888, 0.00331020, 0.0, 0.01582997, 0.14844471, 0.38130522, 0.91231567],
			\LeftLowerArm -> [-0.20895167, -0.00568295, 0.00075426, -0.00008110, 0.00480158, -0.00542149, 0.99997377],
			\LeftHand -> [-0.21772657, -0.00096428, 0.00111227, 0.0, 0.0, 0.0, 1.0],
			\RightShoulder -> [0.01643003, 0.13716209, -0.02260794, 0.0, 0.0, -0.00180446, 0.99999839],
			\RightUpperArm -> [0.05432534, 0.00302815, 0.00000007, 0.00030508, -0.16907151, -0.40111747, 0.90028858],
			\RightLowerArm -> [0.20892271, -0.00663972, 0.00091567, -0.18378475, -0.01255323, -0.00947755, 0.98284066],
			\RightHand -> [0.21772480, -0.00103021, 0.00134510, 0.13737603, 0.00317343, 0.28703606, -0.94801271],
			\LeftUpperLeg -> [-0.06038682, -0.08547634, 0.00091698, 0.0, 0.0, 0.0, 1.0],
			\LeftLowerLeg -> [0.00672504, -0.36331898, 0.00135944, 0.0, 0.0, 0.0, 1.0],
			\LeftFoot -> [0.01252531, -0.41950721, -0.02016912, 0.0, 0.0, 0.0, 1.0],
			\LeftToes -> [0.00343401, -0.08300734, 0.07748183, 0.0, 0.0, 0.0, 1.0],
			\RightUpperLeg -> [0.06038890, -0.08547634, 0.00091698, 0.0, 0.0, 0.0, 1.0],
			\RightLowerLeg -> [-0.00672557, -0.36331898, 0.00135966, 0.0, 0.0, 0.0, 1.0],
			\RightFoot -> [-0.01252660, -0.41950721, -0.02016889, 0.0, 0.0, 0.0, 1.0],
			\RightToes -> [-0.00343461, -0.08300734, 0.07748197, 0.0, 0.0, 0.0, 1.0]
		];
		transforms.keysValuesDo { |name, transform|
			pose.put(name, transform);
		};
		^pose
	}
}
