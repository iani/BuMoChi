BmcTakeSonifier {
	var <server, <routine, <player, <clipName, <playerName;
	var <isPending = false, <isPlaying = false, <isRecording = false;
	var endController, countdownPlayer, sonificationCleanup;

	*new { |server| ^super.new.init(server) }

	init { |argServer|
		server = argServer ?? { Server.default };
		^this
	}

	start { |argClipName, sonifications, argPlayerName = \default, record = false|
		if(isPending or: { isPlaying }) { this.stop };
		clipName = argClipName.asSymbol;
		playerName = argPlayerName.asSymbol;
		if(Bmc.clip(clipName).isNil) { Error("Unknown Bmc clip: %".format(clipName)).throw };
		player = Bmc.player(playerName);
		player.stop;
		isPending = true;

		endController = SimpleController(player);
		endController.put(\end, { this.finish });

		routine = Routine({
			if(record) {
				server.prepareForRecord;
				server.sync;
				server.record;
				isRecording = true;
			};
			countdownPlayer = Pbind(
				\degree, Pseq([Pseq((0..4), 2), 7]),
				\legato, 0.25
			).play;
			// The first note is at the current beat; the final degree 7 begins at beat + 10.
			10.wait;
			Bmc.playClip(clipName, playerName: playerName);
			isPending = false;
			isPlaying = true;
			// The mapped sonification begins after the final degree 7 cue completes.
			1.wait;
			sonificationCleanup = this.startSonifications(sonifications);
		}).play(TempoClock.default);
		^this
	}

	startSonifications { |specification|
		if(specification.isNil) { ^nil };
		if(specification.isKindOf(Function)) {
			^specification.value(player, clipName, playerName)
		};
		if(specification.isSequenceableCollection) {
			^specification.collect { |item| this.startSonifications(item) }
		};
		if(specification.isKindOf(BmcLiveSonification)) {
			^specification.start(player, \frame)
		};
		Error("Unsupported Bmc take sonification specification").throw
	}

	stopSonifications { |object|
		if(object.isNil) { ^this };
		if(object.isSequenceableCollection) {
			object.do { |item| this.stopSonifications(item) };
			^this
		};
		if(object.isKindOf(Function)) { object.value; ^this };
		if(object.respondsTo(\free)) { object.free };
		^this
	}

	finish {
		if(routine.notNil) { routine.stop; routine = nil };
		if(countdownPlayer.notNil) { countdownPlayer.stop; countdownPlayer = nil };
		this.stopSonifications(sonificationCleanup);
		sonificationCleanup = nil;
		if(isRecording and: { server.isRecording }) { server.stopRecording };
		isRecording = false;
		isPending = false;
		isPlaying = false;
		if(endController.notNil) { endController.remove; endController = nil };
		^this
	}

	stop {
		if(isPlaying and: { player.notNil }) {
			player.stop
		} {
			this.finish
		};
		^this
	}

	cancel { ^this.stop }

	status {
		^(
			clipName: clipName,
			playerName: playerName,
			pending: isPending,
			playing: isPlaying,
			recording: isRecording
		)
	}
}
