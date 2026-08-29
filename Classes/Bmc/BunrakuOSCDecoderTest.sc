BunrakuOSCDecoderTest {
	var <destination, <targetPort, <frameRate, <duration, <task, <isRunning, <framesSent;

	*new { |inputPort = 39538, avatarPort, frameRate = 60, duration = 60.0, host = "127.0.0.1"|
		^super.new.init(host, inputPort, avatarPort, frameRate, duration)
	}

	init { |host, inputPort, avatarPort, argFrameRate, argDuration|
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
		var headAngle = sin(phase) * 0.2;
		var pose = Bmc.calibrationFrame.pose.copy;
		var frame;
		pose.put(\Hips, [sin(phase) * 0.08, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
		pose.put(\Head, [0.0, 0.12, 0.0, 0.0, sin(headAngle * 0.5), 0.0, cos(headAngle * 0.5)]);
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
}
