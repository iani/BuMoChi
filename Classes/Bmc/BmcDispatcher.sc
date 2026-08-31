BmcDispatcher {
	var <port, <oscKey, <isRunning = false, <avatars, <destinations;
	var <received = 0, <rejected = 0, <dropped = 0, lastFrameIDs;
	var <sourceRoutes, <lastSources;

	*new { |port = 57130| ^super.new.init(port) }

	init { |argPort|
		port = argPort;
		oscKey = ("bmcDispatcher_" ++ this.identityHash).asSymbol;
		avatars = IdentityDictionary.new;
		destinations = List.new;
		lastFrameIDs = IdentityDictionary.new;
		sourceRoutes = IdentityDictionary.new;
		lastSources = IdentityDictionary.new;
		^this
	}

	start { |argPort|
		if(isRunning) {
			if(argPort.isNil or: { argPort == port }) { ^this };
			this.stop;
		};
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
	routeSource { |sourceName, avatar|
		if(sourceName.isNil) { Error("Bmc source route requires a source name").throw };
		if(avatar.isKindOf(BmcAvatar).not) { Error("Bmc source route requires a BmcAvatar").throw };
		sourceRoutes[sourceName.asSymbol] = avatar;
		^avatar
	}
	removeSourceRoute { |sourceName| ^sourceRoutes.removeAt(sourceName.asSymbol) }
	lastSourceFor { |avatarName| ^lastSources[avatarName.asSymbol] }

	receive { |message, time, addr|
		var streamKey, previous, avatarIndex, sourceIndex, frameIDIndex;
		var sourceName, inputAvatar, routedAvatar, typed;
		try { Bmc.validateMessage(message, "incoming frame") } { |error|
			rejected = rejected + 1;
			this.changed(\rejected, message, error);
			^false
		};

		received = received + 1;
		avatarIndex = Bmc.messageAvatarIndex(message);
		sourceIndex = Bmc.messageSourceIndex(message);
		frameIDIndex = Bmc.messageFrameIDIndex(message);
		sourceName = message[sourceIndex].asSymbol;
		inputAvatar = message[avatarIndex].asSymbol;
		lastSources[inputAvatar] = sourceName;
		streamKey = (message[sourceIndex].asString ++ "|" ++ message[avatarIndex].asString).asSymbol;
		previous = lastFrameIDs[streamKey];
		if(previous.notNil and: { message[frameIDIndex] != (previous + 1) }) { dropped = dropped + 1 };
		lastFrameIDs[streamKey] = message[frameIDIndex];

		time = time ?? { SystemClock.seconds };
		this.changed(\rawFrame, message, time, addr);
		destinations.do { |destination|
			if(destination.respondsTo(\receiveFrame)) { destination.receiveFrame(message, time) };
		};
		routedAvatar = sourceRoutes[sourceName];
		if(routedAvatar.notNil) {
			typed = BmcFrame.fromOSC(message).withoutRoute.withAvatar(routedAvatar.avatarName);
			routedAvatar.receiveFrame(typed, time);
		} {
			avatars.values.asSet.do { |targetAvatar|
				targetAvatar.receiveSourceFrame(message, time);
			};
		};
		^true
	}

	status {
		^(running: isRunning, port: port, received: received,
			rejected: rejected, dropped: dropped, avatars: avatars.size,
			sourceRoutes: sourceRoutes.collect(_.avatarID))
	}
}
