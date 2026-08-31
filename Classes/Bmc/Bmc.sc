// Bunraku-Mocap-Copy: fixed-frame bone selection and merging.
//
// Bmc(target, source, bones) returns a copy of target in which the selected
// 7-value transforms have been replaced by values from source. Both arguments
// may be raw /bunraku/vmc/frame messages or OscRecorder session entries of the
// form [recordingTime, message]. The input objects are never modified.

Bmc {
	classvar <boneNames;
	classvar <dispatcher, <recorder, <players, <library, <avatars, <wires;
	classvar <defaultAvatar, recordingName, recordingFormat, recorderPublisher;
	classvar <defaultXrAnimatorOutputPort, <defaultInputPort, <defaultDecoderPort;
	classvar <defaultAvatarID, <defaultAvatarName, <defaultAvatarVmcPort;
	classvar <sessions, <currentSession;
	classvar <decoderPort, <forwardDecoder;
	classvar <compositor;

	*initClass {
		boneNames = #[
			\Hips, \Spine, \Chest, \Neck, \Head,
			\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand,
			\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand,
			\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes,
			\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes
		];
		defaultXrAnimatorOutputPort = 39537;
		defaultInputPort = 57130;
		defaultDecoderPort = 39538;
		defaultAvatarID = \Ishidomaru;
		defaultAvatarName = "Ishidomaru";
		defaultAvatarVmcPort = 39539;
		this.initializeEnvironment;
		StartUp.add({ this.start(defaultInputPort) });
	}

	*initializeEnvironment {
		library = BmcClipLibrary.new;
		dispatcher = BmcDispatcher.new(defaultInputPort);
		recorder = BmcClipRecorder.new;
		avatars = IdentityDictionary.new;
		wires = List.new;
		decoderPort = defaultDecoderPort;
		forwardDecoder = true;
		defaultAvatar = BmcAvatar(defaultAvatarID, defaultAvatarName);
		defaultAvatar.vmcPort_(defaultAvatarVmcPort);
		defaultAvatar.output_({ |message| this.sendOutput(message) });
		avatars[defaultAvatarID] = defaultAvatar;
		avatars[\default] = defaultAvatar;
		dispatcher.registerAvatar(defaultAvatar);
		players = IdentityDictionary.new;
		players[\default] = BmcClipPlayer(nil, defaultAvatar, \default);
		compositor = BmcCompositor({ avatars.values.asSet.asArray }, 60.0);
		sessions = IdentityDictionary.new;
		currentSession = nil;
	}

	// This utility class returns the merged data directly; it has no instance.
	*new { |target, source, bones|
		^this.combine(target, source, bones)
	}

	// ----- top-level system -----
	*start { |port = 57130|
		dispatcher.start(port);
		compositor.start;
		^this
	}

	*stop {
		players.values.do { |clipPlayer| clipPlayer.stop };
		compositor.stop;
		if(recorder.isRecording) { this.cancelRecording };
		dispatcher.stop;
		^this
	}

	*status {
		var result = dispatcher.status.copy.putAll((
			recording: recorder.isRecording,
			playing: players.values.any { |clipPlayer| clipPlayer.isPlaying },
			playerCount: players.size,
			playingPlayers: players.keys.select { |name| players[name].isPlaying },
			compositor: compositor.status,
			currentClip: library.currentName,
			clipCount: library.size,
			wireCount: wires.size
		));
		result.postln;
		^result
	}

	*compositorRate { |value|
		if(value.isNil) { ^compositor.rate };
		compositor.rate_(value);
		^this
	}
	*compositorRate_ { |value| compositor.rate_(value); ^value }
	*startCompositor { compositor.start; ^this }
	*stopCompositor { compositor.stop; ^this }

	*help {
		var configuredAvatars = avatars.values.asSet.select { |avatar|
			avatar.vmcPort.notNil
		}.asArray.sort { |left, right|
			left.avatarName.asString < right.avatarName.asString
		};
		var avatarRoutes = if(configuredAvatars.isEmpty) {
			"  (none)"
		} {
			configuredAvatars.collect { |avatar|
				"  %: %".format(avatar.avatarName, avatar.vmcPort)
			}.join("\n")
		};
		var inputPort = dispatcher.port;
		var text = [
			"XR-Animator output port: %".format(defaultXrAnimatorOutputPort),
			"BunrakuOSCEncoder output port: %".format(inputPort),
			"SuperCollider VMC/OSC input port: %".format(inputPort),
			"SuperCollider VMC/OSC output port: %".format(decoderPort),
			"BunrakuOSCDecoder input port: %".format(decoderPort),
			"BunrakuOSCDecoder output ports:",
			avatarRoutes
		].join("\n");
		"-----------------------------".postln;
		text.postln;
		"-----------------------------".postln;
		^text
	}

	*showDispatcherStatus { |updateInterval = 0.25|
		updateInterval = updateInterval.asFloat.max(0.05);
		{
			var window = Window("Bmc OSC/VMC Input", Rect(0, 0, 300, 100));
			var listening = StaticText().string_(
				"Listening for '/bunraku/vmc/frame' on port: %".format(dispatcher.port)
			);
			var text = TextView().editable_(false);
			var updater;
			window.layout = VLayout(listening, text);
			updater = Routine({
				loop {
					text.string_(dispatcher.status.asCompileString);
					updateInterval.wait;
				}
			}).play(AppClock);
			window.onClose_({ updater.stop });
			window.front;
		}.defer;
		^this
	}

	*reset {
		this.stop;
		this.initializeEnvironment;
		this.start(defaultInputPort);
		^this
	}

	// ----- avatars and outputs -----
	*avatar { |name|
		if(name.isNil) { ^defaultAvatar };
		^avatars[name.asSymbol]
	}
	*addAvatar { |name, displayName|
		var object = BmcAvatar(name, displayName);
		object.output_({ |message| this.sendOutput(message) });
		avatars[name.asSymbol] = object;
		dispatcher.registerAvatar(object);
		^object
	}

	*selectAvatar { |name|
		defaultAvatar = this.avatar(name);
		if(defaultAvatar.isNil) { Error("Unknown Bmc avatar: %".format(name)).throw };
		this.player.output_(defaultAvatar);
		^defaultAvatar
	}

	*output { |destination|
		defaultAvatar.output_(destination);
		this.player.output_(defaultAvatar);
		^destination
	}

	*decoderPort_ { |port| decoderPort = this.validPort(port); ^decoderPort }
	*forwardDecoder_ { |flag = true| forwardDecoder = flag == true; ^forwardDecoder }

	*sendOutput { |message|
		if(forwardDecoder) { NetAddr("127.0.0.1", decoderPort).sendMsg(*message) };
		^message
	}

	*sendCalibrationFrame { |port|
		var frame = this.calibrationFrame;
		port = this.validPort(port ?? { decoderPort });
		NetAddr("127.0.0.1", port).sendMsg(*frame.asOSCMessage);
		^frame
	}

	*testBunrakuOSCDecoder { |inputPort = 39538, avatarPort, frameRate = 60, duration = 60.0, pose = \rest|
		^BunrakuOSCDecoderTest(inputPort, avatarPort, frameRate, duration, pose)
	}

	*calibrationFrame {
		var pose = BmcPose.neutral;
		var rotation = [0.0, 0.0, 0.0, 1.0];
		var positions = IdentityDictionary[
			\Hips -> [0.00, 1.00, 0.00],
			\Spine -> [0.00, 0.10, 0.00],
			\Chest -> [0.00, 0.14, 0.00],
			\Neck -> [0.00, 0.14, 0.00],
			\Head -> [0.00, 0.12, 0.00],
			\LeftShoulder -> [0.10, 0.08, 0.00],
			\LeftUpperArm -> [0.18, 0.00, 0.00],
			\LeftLowerArm -> [0.25, 0.00, 0.00],
			\LeftHand -> [0.20, 0.00, 0.00],
			\RightShoulder -> [-0.10, 0.08, 0.00],
			\RightUpperArm -> [-0.18, 0.00, 0.00],
			\RightLowerArm -> [-0.25, 0.00, 0.00],
			\RightHand -> [-0.20, 0.00, 0.00],
			\LeftUpperLeg -> [0.08, -0.40, 0.00],
			\LeftLowerLeg -> [0.00, -0.40, 0.00],
			\LeftFoot -> [0.00, -0.10, 0.05],
			\LeftToes -> [0.00, 0.00, 0.10],
			\RightUpperLeg -> [-0.08, -0.40, 0.00],
			\RightLowerLeg -> [0.00, -0.40, 0.00],
			\RightFoot -> [0.00, -0.10, 0.05],
			\RightToes -> [0.00, 0.00, 0.10]
		];
		if(defaultAvatar.isNil) { Error("Bmc has no selected avatar").throw };
		if(defaultAvatar.vmcPort.isNil) {
			Error("Bmc selected avatar has no VMC destination port").throw
		};
		positions.keysValuesDo { |name, position|
			pose.put(name, position ++ rotation);
		};
		^BmcFrame(
			defaultAvatar.avatarName,
			"bmc-calibration",
			0,
			SystemClock.seconds,
			pose
		).withTargetPort(defaultAvatar.vmcPort)
	}

	*validPort { |port|
		port = port.asInteger;
		if((port < 1) or: { port > 65535 }) {
			Error("Invalid Bmc output port: %".format(port)).throw
		};
		^port
	}

	// ----- recording -----
	*record { |name, avatar, source, capturePoint = \rawFrame, metadata|
		^this.startRecording(name, avatar, source, capturePoint, metadata, \scd)
	}

	*recordScd { |name, avatar, source, capturePoint = \rawFrame, metadata|
		^this.startRecording(name, avatar, source, capturePoint, metadata, \scd)
	}

	*recordBmc { |name, avatar, source, capturePoint = \rawFrame, metadata|
		^this.startRecording(name, avatar, source, capturePoint, metadata, \bmc)
	}

	*startRecording { |name, avatar, source, capturePoint, metadata, format|
		if(recorder.isRecording) { Error("Bmc is already recording").throw };
		recordingName = name;
		recordingFormat = format;
		recorder.record(avatar, source, capturePoint, metadata);
		recorderPublisher = if(capturePoint == \completedFrame) { defaultAvatar } { dispatcher };
		recorderPublisher.addDependant(recorder);
		^recorder
	}

	*stopRecording {
		var clip;
		if(recorder.isRecording.not) { Error("Bmc is not recording").throw };
		recorderPublisher.removeDependant(recorder);
		recorderPublisher = nil;
		clip = recorder.stop;
		library.add(recordingName, clip);
		if(recordingFormat == \bmc) {
			library.save(recordingName)
		} {
			library.saveScd(recordingName)
		};
		recordingName = nil;
		recordingFormat = nil;
		^clip
	}

	*cancelRecording {
		if(recorderPublisher.notNil) { recorderPublisher.removeDependant(recorder) };
		recorderPublisher = nil;
		recordingName = nil;
		recordingFormat = nil;
		recorder.cancel;
		^this
	}

	*isRecording { ^recorder.isRecording }

	// ----- clip library -----
	*clips { ^library.clips }
	*clip { |name| ^library.at(name) }
	*selectClip { |name| ^library.select(name) }
	*currentClip { ^library.current }
	*listClips { ^library.list }
	*showClips { ^library.show }
	*removeClip { |name| ^library.remove(name) }
	*renameClip { |oldName, newName| ^library.rename(oldName, newName) }
	*loadClip { |path, name| ^library.load(path, name) }
	*load { |path, name| ^this.loadClip(path, name) }
	*loadClipScd { |path, name| ^library.loadScd(path, name) }
	*saveClip { |name, path| ^library.save(name, path) }
	*save { |name, path| ^this.saveClip(name, path) }
	*saveClipScd { |name, path| ^library.saveScd(name, path) }
	*clipToScd { |name| ^library.exportScd(name) }
	*convertClipToScd { |name| ^this.clipToScd(name) }

	// ----- playback -----
	*player { |name = \default|
		var result = players[name.asSymbol];
		if(result.isNil) { Error("Unknown Bmc clip player: %".format(name)).throw };
		^result
	}
	*playerNames { ^players.keys.asArray.sort }
	*removePlayer { |name|
		var key = name.asSymbol;
		var result;
		if(key == \default) { Error("Bmc default player cannot be removed").throw };
		result = players.removeAt(key);
		if(result.notNil) { result.stop };
		^result
	}

	*play { |name, loop = false, rate = 1.0, startFrame = 0, endFrame,
		playerName = \default, avatarName, compositionRule = \overwrite|
		var selected = if(name.isNil) { library.current } { library.select(name) };
		var key = (playerName ?? { \default }).asSymbol;
		var clipPlayer;
		var targetAvatar = if(avatarName.isNil) { defaultAvatar } { this.avatar(avatarName) };
		if(selected.isNil) { Error("Bmc has no selected clip").throw };
		if(targetAvatar.isNil) { Error("Unknown Bmc avatar: %".format(avatarName)).throw };
		clipPlayer = players[key];
		if(clipPlayer.isNil) {
			clipPlayer = BmcClipPlayer(nil, defaultAvatar, key);
			players[key] = clipPlayer;
		};
		clipPlayer.output_(targetAvatar);
		clipPlayer.compositionRule_(compositionRule);
		clipPlayer.clip_(selected);
		clipPlayer.loop_(loop);
		clipPlayer.rate_(rate);
		clipPlayer.range_(startFrame, endFrame);
		clipPlayer.play;
		^clipPlayer
	}
	*playClip { |name, loop = false, rate = 1.0, startFrame = 0, endFrame,
		playerName = \default, avatarName, compositionRule = \overwrite|
		^this.play(name, loop, rate, startFrame, endFrame,
			playerName, avatarName, compositionRule)
	}

	*pause { |playerName = \default| this.player(playerName).pause; ^this }
	*freeze { |playerName = \default| this.player(playerName).freeze; ^this }
	*resume { |playerName = \default| this.player(playerName).resume; ^this }
	*stopPlayback { |playerName = \default| this.player(playerName).stop; ^this }
	*restartPlayback { |playerName = \default| this.player(playerName).restart; ^this }
	*resetPlayback { |playerName = \default| this.player(playerName).reset; ^this }
	*seek { |seconds, playerName = \default| this.player(playerName).seek(seconds); ^this }
	*rate { |value, playerName = \default| this.player(playerName).rate_(value); ^this }
	*loop { |flag = true, playerName = \default| this.player(playerName).loop_(flag); ^this }

	// ----- playback sessions -----
	*saveSession { |name, clipSettings, avatarSettings, path, decoderSettings|
		var session = BmcSession(name, clipSettings, avatarSettings, decoderSettings);
		session.write(path);
		sessions[session.name] = session;
		currentSession = session;
		^session
	}

	*loadSession { |nameOrPath|
		var path = nameOrPath.asString;
		var session;
		if(File.exists(path).not) {
			path = BmcSession.defaultDirectory +/+ (path ++ ".scd");
		};
		session = BmcSession.read(path);
		sessions[session.name] = session;
		currentSession = session;
		^session
	}

	*applySession { |name|
		var session = if(name.isNil) { currentSession } { sessions[name.asSymbol] };
		if(session.isNil) { Error("Unknown Bmc session: %".format(name)).throw };
		if(session.decoder.notNil) { this.decoderPort_(session.decoder[\port]) };
		session.avatars.keysValuesDo { |avatarName, route|
			var object = this.avatar(avatarName);
			if(object.isNil) { object = this.addAvatar(avatarName, avatarName.asString) };
			if(session.decoder.isNil) {
				// Legacy session: each avatar points at its dedicated decoder.
				object.vmcPort_(nil);
				object.output_(NetAddr(route[\host].asString, route[\port].asInteger));
			} {
				var vmcPort = route[\vmcPort] ?? { route[\port] };
				if(vmcPort.isNil) {
					Error("Session avatar % requires vmcPort for routed decoding"
						.format(avatarName)).throw;
				};
				object.output_({ |message| this.sendOutput(message) });
				object.vmcPort_(vmcPort);
			};
		};
		currentSession = session;
		^session
	}

	*playSessionClip { |key, sessionName|
		var session = if(sessionName.isNil) { currentSession } { sessions[sessionName.asSymbol] };
		var settings, avatarObject, clip, clipPath;
		if(session.isNil) { Error("No Bmc session selected").throw };
		this.applySession(session.name);
		settings = session.clipSettings(key);
		if(settings.isNil) { Error("Unknown session clip: %".format(key)).throw };
		avatarObject = this.avatar(settings[\avatar]);
		clip = library.at(settings[\clip]);
		if(clip.isNil) {
			clipPath = settings[\path] ?? {
				library.savedPathFor(settings[\clip])
				?? { library.defaultScdPathFor(settings[\clip]) }
			};
			clip = library.load(clipPath, settings[\clip]);
		};
		defaultAvatar = avatarObject;
		this.player.output_(avatarObject);
		this.player.clip_(clip);
		this.player.rate_(settings[\rate]);
		this.player.loop_(settings[\loop]);
		this.player.seek(settings[\start]);
		this.player.play;
		^this.player
	}

	// ----- clip composition -----
	*combineClips { |target, source, bones, result, startIndex = 0|
		var targetClip = library.at(target);
		var sourceClip = library.at(source);
		var entries, count, resultClip;
		if(targetClip.isNil) { Error("Unknown target clip: %".format(target)).throw };
		if(sourceClip.isNil) { Error("Unknown source clip: %".format(source)).throw };
		entries = targetClip.asArray;
		count = sourceClip.size.min((entries.size - startIndex).max(0));
		count.do { |index|
			entries[startIndex + index] = this.combine(
				entries[startIndex + index], sourceClip.at(index), bones
			);
		};
		resultClip = BmcAnimationClip(entries, (
			targetClip: target, sourceClip: source, bones: Bmc.normalizeBones(bones)
		));
		library.add(result, resultClip);
		^resultClip
	}

	// ----- live wires -----
	*wire { |source, bones, target = \default, sourceAvatar, priority = 0|
		var targetObject = this.avatar(target);
		var object;
		if(targetObject.isNil) { targetObject = this.addAvatar(target) };
		object = BmcWire(source, sourceAvatar, targetObject.avatarID, bones, priority);
		targetObject.addWire(object);
		wires.add(object);
		^object
	}

	*addFrameSource { |name, source, target = \default, sourceAvatar, mode, bones|
		var targetObject = this.avatar(target);
		var object;
		if(targetObject.isNil) { targetObject = this.addAvatar(target) };
		mode = mode ?? { if(bones.isNil) { \overwrite } { \compose } };
		object = BmcFrameSource(name, source, sourceAvatar, mode, bones);
		targetObject.addWire(object);
		wires.add(object);
		^object
	}

	*unwire { |wire|
		wires.remove(wire);
		avatars.values.asSet.do { |object| object.removeWire(wire) };
		^wire
	}
	*removeFrameSource { |sourceCache| ^this.unwire(sourceCache) }
	*frameSources { ^wires.copy }

	*listWires { wires.do(_.postln); ^wires.copy }
	*clearWires {
		avatars.values.asSet.do(_.clearWires);
		wires.clear;
		^this
	}

	*combine { |target, source, bones|
		var targetIsEntry, sourceIsEntry, targetMessage, sourceMessage, result;
		targetIsEntry = this.isSessionEntry(target);
		sourceIsEntry = this.isSessionEntry(source);
		targetMessage = if(targetIsEntry) { target[1] } { target };
		sourceMessage = if(sourceIsEntry) { source[1] } { source };

		this.validateMessage(targetMessage, "target");
		this.validateMessage(sourceMessage, "source");
		bones = this.normalizeBones(bones);
		result = targetMessage.copy;

		bones.do { |bone|
			var targetStart = this.boneStart(bone, targetMessage);
			var sourceStart = this.boneStart(bone, sourceMessage);
			7.do { |offset|
				result[targetStart + offset] = sourceMessage[sourceStart + offset];
			};
		};

		// A session entry retains the target's recording time. A raw target
		// produces a raw OSC message, irrespective of the source representation.
		^if(targetIsEntry) { [target[0], result] } { result }
	}

	// Replace selected bones over a sequence of frames. Source frame zero is
	// applied to target[startIndex], source frame one to target[startIndex + 1],
	// and so on. The returned sequence and its replaced frames are copies.
	*rseq { |target, source, bones, startIndex = 0|
		var result;
		if(target.isSequenceableCollection.not) {
			Error("Bmc.rseq: target must be an array of frames").throw;
		};
		if(source.isSequenceableCollection.not) {
			Error("Bmc.rseq: source must be an array of frames").throw;
		};
		if(startIndex.isKindOf(Integer).not or: { startIndex < 0 }) {
			Error("Bmc.rseq: startIndex must be a non-negative integer").throw;
		};
		if((startIndex + source.size) > target.size) {
			Error(
				"Bmc.rseq: source has % frames, but only % target frames are "
				"available from startIndex %"
				.format(source.size, target.size - startIndex, startIndex)
			).throw;
		};

		bones = this.normalizeBones(bones);
		result = target.copy;
		source.do { |sourceFrame, sourceIndex|
			var targetIndex = startIndex + sourceIndex;
			result[targetIndex] = this.combine(
				target[targetIndex], sourceFrame, bones
			);
		};
		^result
	}

	*bone { |frame, boneName|
		var message = if(this.isSessionEntry(frame)) { frame[1] } { frame };
		var start;
		this.validateMessage(message, "frame");
		start = this.boneStart(boneName, message);
		^message.copyRange(start, start + 6)
	}

	*boneStart { |boneName, message|
		var normalized = boneName.asSymbol;
		var index = boneNames.indexOfEqual(normalized);
		if(index.isNil) {
			Error("Bmc: unknown bone %, expected one of %"
				.format(boneName, boneNames)).throw;
		};
		^(if(message.isNil) { 6 } { this.messageHeaderSize(message) }) + (index * 7)
	}

	*messageHeaderSize { |message|
		^if(this.messageIsRouted(message)) { 7 } { 6 }
	}

	*messageIsRouted { |message| ^[2, 4].includes(message[1].asInteger) }
	*messageAvatarIndex { |message| ^if(this.messageIsRouted(message)) { 3 } { 2 } }
	*messageSourceIndex { |message| ^if(this.messageIsRouted(message)) { 4 } { 3 } }
	*messageFrameIDIndex { |message| ^if(this.messageIsRouted(message)) { 5 } { 4 } }
	*messageTimestampIndex { |message| ^if(this.messageIsRouted(message)) { 6 } { 5 } }

	*normalizeBones { |bones|
		if(bones.isNil) { Error("Bmc: bones cannot be nil").throw };
		bones = BmcBoneSets.resolve(bones);
		if(bones.isKindOf(Symbol) or: { bones.isKindOf(String) }) {
			bones = [bones];
		};
		if(bones.isSequenceableCollection.not) {
			Error("Bmc: bones must be a bone name or an array of names").throw;
		};
		// Arrays may mix exact canonical bone names and named body regions.
		bones = bones.collect { |bone| BmcBoneSets.resolve(bone) }.flat.collect(_.asSymbol);
		bones.do { |bone| this.boneStart(bone) };
		^bones
	}

	*isSessionEntry { |object|
		^object.isSequenceableCollection
		and: { object.size == 2 }
		and: { object[1].isSequenceableCollection }
		and: { object[1].notEmpty }
		and: { object[1][0].asString == "/bunraku/vmc/frame" }
	}

	*validateMessage { |message, role = "frame"|
		if(message.isSequenceableCollection.not) {
			Error("Bmc: % is not a Bunraku message array".format(role)).throw;
		};
		if(message[0].asString != "/bunraku/vmc/frame") {
			Error("Bmc: % has OSC address %, expected /bunraku/vmc/frame"
				.format(role, message[0])).throw;
		};
		if([1, 2, 3, 4].includes(message[1].asInteger).not) {
			Error("Bmc: % uses unsupported protocol version %"
				.format(role, message[1])).throw;
		};
		if(message[1].asInteger == 1 and: { message.size != 153 }) {
			Error("Bmc: % version-1 message has % elements; expected 153"
				.format(role, message.size)).throw;
		};
		if(message[1].asInteger == 2) {
			if(message.size != 154) {
				Error("Bmc: % version-2 message has % elements; expected 154"
					.format(role, message.size)).throw;
			};
			if((message[2].asInteger < 1) or: { message[2].asInteger > 65535 }) {
				Error("Bmc: % has invalid routed target port %"
					.format(role, message[2])).throw;
			};
		};
		if(message[1].asInteger == 3) {
			this.validateExtendedMessage(message, role, 153);
		};
		if(message[1].asInteger == 4) {
			if((message[2].asInteger < 1) or: { message[2].asInteger > 65535 }) {
				Error("Bmc: % has invalid routed target port %"
					.format(role, message[2])).throw;
			};
			this.validateExtendedMessage(message, role, 154);
		};
	}

	*validateExtendedMessage { |message, role, start|
		var index = start, extraCount, blendCount;
		if(message.size < (start + 2)) {
			Error("Bmc: % extended frame is truncated".format(role)).throw;
		};
		extraCount = message[index].asInteger;
		if(extraCount < 0) { Error("Bmc: % has a negative extra-bone count".format(role)).throw };
		index = index + 1 + (extraCount * 8);
		if(index >= message.size) {
			Error("Bmc: % extended bone data is truncated".format(role)).throw;
		};
		blendCount = message[index].asInteger;
		if(blendCount < 0) { Error("Bmc: % has a negative blend count".format(role)).throw };
		index = index + 1 + (blendCount * 2);
		if(index != message.size) {
			Error("Bmc: % extended payload has % elements; counts require %"
				.format(role, message.size, index)).throw;
		};
	}

	// utilities
	*trace { OSCFunc.trace(true, true); }
	*untrace { OSCFunc.trace(false, false); }
}
