// Bunraku-Mocap-Copy: fixed-frame bone selection and merging.
//
// Bmc(target, source, bones) returns a copy of target in which the selected
// 7-value transforms have been replaced by values from source. Both arguments
// may be raw /bunraku/vmc/frame messages or OscRecorder session entries of the
// form [recordingTime, message]. The input objects are never modified.

Bmc {
	classvar <boneNames;
	classvar <dispatcher, <recorder, <player, <library, <avatars, <wires;
	classvar <defaultAvatar, recordingName, recorderPublisher;
	classvar <sessions, <currentSession;
	classvar <decoderPort, <forwardDecoder;

	*initClass {
		boneNames = #[
			\Hips, \Spine, \Chest, \Neck, \Head,
			\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand,
			\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand,
			\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes,
			\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes
		];
		this.initializeEnvironment;
	}

	*initializeEnvironment {
		library = BmcClipLibrary.new;
		dispatcher = BmcDispatcher.new;
		recorder = BmcClipRecorder.new;
		avatars = IdentityDictionary.new;
		wires = List.new;
		decoderPort = 39538;
		forwardDecoder = true;
		defaultAvatar = BmcAvatar(\default, "default");
		defaultAvatar.output_({ |message| this.sendOutput(message) });
		avatars[\default] = defaultAvatar;
		dispatcher.registerAvatar(defaultAvatar);
		player = BmcClipPlayer(nil, defaultAvatar);
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
		^this
	}

	*stop {
		this.stopPlayback;
		if(recorder.isRecording) { this.cancelRecording };
		dispatcher.stop;
		^this
	}

	*status {
		var result = dispatcher.status.copy.putAll((
			recording: recorder.isRecording,
			playing: player.isPlaying,
			currentClip: library.currentName,
			clipCount: library.size,
			wireCount: wires.size
		));
		result.postln;
		^result
	}

	*reset {
		this.stop;
		this.initializeEnvironment;
		^this
	}

	// ----- avatars and outputs -----
	*avatar { |name = \default| ^avatars[name.asSymbol] }
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
		player.output_(defaultAvatar);
		^defaultAvatar
	}

	*output { |destination|
		defaultAvatar.output_(destination);
		player.output_(defaultAvatar);
		^destination
	}

	*decoderPort_ { |port| decoderPort = this.validPort(port); ^decoderPort }
	*forwardDecoder_ { |flag = true| forwardDecoder = flag == true; ^forwardDecoder }

	*sendOutput { |message|
		if(forwardDecoder) { NetAddr("127.0.0.1", decoderPort).sendMsg(*message) };
		^message
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
		if(recorder.isRecording) { Error("Bmc is already recording").throw };
		recordingName = name;
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
		recordingName = nil;
		^clip
	}

	*cancelRecording {
		if(recorderPublisher.notNil) { recorderPublisher.removeDependant(recorder) };
		recorderPublisher = nil;
		recordingName = nil;
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
	*play { |name|
		var selected = if(name.isNil) { library.current } { library.select(name) };
		if(selected.isNil) { Error("Bmc has no selected clip").throw };
		player.clip_(selected);
		player.play;
		^player
	}
	*playClip { |name| ^this.play(name) }

	*pause { player.pause; ^this }
	*resume { player.resume; ^this }
	*stopPlayback { player.stop; ^this }
	*seek { |seconds| player.seek(seconds); ^this }
	*rate { |value| player.rate_(value); ^this }
	*loop { |flag = true| player.loop_(flag); ^this }

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
			clipPath = settings[\path] ?? { library.defaultPathFor(settings[\clip]) };
			clip = library.load(clipPath, settings[\clip]);
		};
		defaultAvatar = avatarObject;
		player.output_(avatarObject);
		player.clip_(clip);
		player.rate_(settings[\rate]);
		player.loop_(settings[\loop]);
		player.seek(settings[\start]);
		player.play;
		^player
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

	*unwire { |wire|
		wires.remove(wire);
		avatars.values.asSet.do { |object| object.removeWire(wire) };
		^wire
	}

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
		^if(message[1].asInteger == 2) { 7 } { 6 }
	}

	*messageAvatarIndex { |message| ^if(message[1].asInteger == 2) { 3 } { 2 } }
	*messageSourceIndex { |message| ^if(message[1].asInteger == 2) { 4 } { 3 } }
	*messageFrameIDIndex { |message| ^if(message[1].asInteger == 2) { 5 } { 4 } }
	*messageTimestampIndex { |message| ^if(message[1].asInteger == 2) { 6 } { 5 } }

	*normalizeBones { |bones|
		if(bones.isNil) { Error("Bmc: bones cannot be nil").throw };
		bones = BmcBoneSets.resolve(bones);
		if(bones.isKindOf(Symbol) or: { bones.isKindOf(String) }) {
			bones = [bones];
		};
		if(bones.isSequenceableCollection.not) {
			Error("Bmc: bones must be a bone name or an array of names").throw;
		};
		bones = bones.collect(_.asSymbol);
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
		if([1, 2].includes(message[1].asInteger).not) {
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
	}

	// utilities
	*trace { OSCFunc.trace(true, true); }
	*untrace { OSCFunc.trace(false, false); }
}
