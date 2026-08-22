BmcDispatcher {
	var <port, <oscKey, <isRunning = false, <avatars, <destinations;
	var <received = 0, <rejected = 0, <dropped = 0, lastFrameIDs;

	*new { |port = 57130| ^super.new.init(port) }

	init { |argPort|
		port = argPort;
		oscKey = ("bmcDispatcher_" ++ this.identityHash).asSymbol;
		avatars = IdentityDictionary.new;
		destinations = List.new;
		lastFrameIDs = IdentityDictionary.new;
		^this
	}

	start { |argPort|
		if(isRunning) { ^this };
		port = argPort ?? { port };
		OSCdef(oscKey, { |msg, time, addr|
			this.receive(msg, time, addr);
		}, '/bunraku/vmc/frame', recvPort: port);
		isRunning = true;
		^this
	}

	stop {
		OSCdef(oscKey).free;
		isRunning = false;
		^this
	}

	registerAvatar { |avatar|
		avatars[avatar.avatarID.asSymbol] = avatar;
		avatars[avatar.avatarName.asSymbol] = avatar;
		^avatar
	}

	unregisterAvatar { |avatar|
		avatars.keysValuesDo { |key, value| if(value === avatar) { avatars.removeAt(key) } };
		^avatar
	}

	addDestination { |object| destinations.add(object); ^object }
	removeDestination { |object| destinations.remove(object); ^object }

	receive { |message, time, addr|
		var streamKey, previous, avatar;
		try { Bmc.validateMessage(message, "incoming frame") } { |error|
			rejected = rejected + 1;
			this.changed(\rejected, message, error);
			^false
		};

		received = received + 1;
		streamKey = (message[3].asString ++ "|" ++ message[2].asString).asSymbol;
		previous = lastFrameIDs[streamKey];
		if(previous.notNil and: { message[4] != (previous + 1) }) { dropped = dropped + 1 };
		lastFrameIDs[streamKey] = message[4];

		time = time ?? { SystemClock.seconds };
		this.changed(\rawFrame, message, time, addr);
		destinations.do { |destination|
			if(destination.respondsTo(\receiveFrame)) { destination.receiveFrame(message, time) };
		};
		avatar = avatars[message[2].asSymbol];
		if(avatar.notNil) { avatar.receiveFrame(message, time) };
		avatars.values.asSet.do { |targetAvatar|
			targetAvatar.receiveSourceFrame(message, time);
		};
		^true
	}

	status {
		^(running: isRunning, port: port, received: received,
			rejected: rejected, dropped: dropped, avatars: avatars.size)
	}
}
