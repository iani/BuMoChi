// Bunraku Frame receiver, skeleton inspection, Avatar adapter, and playback tests
// =============================================================================
// Wire format: /bunraku/vmc/frame
// version, avatar, source, frameID, timestamp, then 21 * 7 transform floats.
// Each transform is [x, y, z, qx, qy, qz, qw].
//
// This file deliberately keeps the fixed-order wire frame separate from the
// named-joint compatibility view consumed by the existing BuMoChi Avatar API.
// Evaluate the whole parenthesized block, then use the examples at the bottom.

(
~bunrakuWireAddress = '/bunraku/vmc/frame';
~bunrakuAvatarAddress = '/bunraku/avatar/frame';
~bunrakuListenPort = 57130;
~bunrakuGodotAdapter = NetAddr("127.0.0.1", 39538);

~bunrakuBoneNames = [
	\Hips, \Spine, \Chest, \Neck, \Head,
	\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand,
	\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand,
	\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes,
	\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes
];

// Names expected by the current Avatar/RokokoParser implementation.
~bunrakuAvatarBoneNames = [
	\hip, \spine, \chest, \neck, \head,
	\leftShoulder, \leftUpperArm, \leftLowerArm, \leftHand,
	\rightShoulder, \rightUpperArm, \rightLowerArm, \rightHand,
	\leftUpLeg, \leftLeg, \leftFoot, \leftToe,
	\rightUpLeg, \rightLeg, \rightFoot, \rightToe
];

~bunrakuGroups = IdentityDictionary[
	\head -> [\Neck, \Head],
	\torso -> [\Hips, \Spine, \Chest, \Neck, \Head],
	\leftArm -> [\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand],
	\rightArm -> [\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand],
	\leftLeg -> [\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes],
	\rightLeg -> [\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes],
	\upperBody -> [
		\Spine, \Chest, \Neck, \Head,
		\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand,
		\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand
	],
	\lowerBody -> [
		\Hips, \LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes,
		\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes
	]
];

~bunrakuLatest = nil;
~bunrakuFrameCount = 0;
~bunrakuMissingFrameCount = 0;
~bunrakuLastFrameBySource = IdentityDictionary.new;
~bunrakuForwardToGodot = false;
~bunrakuPublishToAvatar = true;
~onBunrakuFrame = { |frame| };

~bunrakuParse = { |msg|
	var frame, values;
	if(msg.size != (6 + (~bunrakuBoneNames.size * 7))) {
		Error("Bunraku Frame has wrong size: % (expected %)"
			.format(msg.size, 6 + (~bunrakuBoneNames.size * 7))).throw;
	};
	if(msg[1].asInteger != 1) {
		Error("Unsupported Bunraku Frame version: %".format(msg[1])).throw;
	};
	values = msg[6..];
	frame = (
		version: msg[1].asInteger,
		avatar: msg[2].asString,
		source: msg[3].asString,
		frameID: msg[4].asInteger,
		timestamp: msg[5].asFloat,
		bones: IdentityDictionary.new
	);
	~bunrakuBoneNames.do { |name, index|
		frame[\bones][name] = values.copyRange(index * 7, (index * 7) + 6)
			.collect(_.asFloat);
	};
	frame
};

~bunrakuBuildWire = { |frame|
	var values = ~bunrakuBoneNames.collect { |name| frame[\bones][name] }.flat;
	[~bunrakuWireAddress, frame[\version], frame[\avatar], frame[\source],
		frame[\frameID], frame[\timestamp]] ++ values
};

~bunrakuBuildAvatarView = { |frame|
	var result = [~bunrakuAvatarAddress, frame[\timestamp], frame[\avatar].asSymbol];
	~bunrakuAvatarBoneNames.do { |avatarName, index|
		result = result ++ [avatarName] ++ [frame[\bones][~bunrakuBoneNames[index]]]
	};
	// Existing recordings include toe-end placeholders. They are not part of
	// canonical Bunraku Frame, but adding them keeps Avatar message shape stable.
	result = result ++ [\leftToeEnd, 0, 0, 0, 0, 0, 0, 1];
	result = result ++ [\rightToeEnd, 0, 0, 0, 0, 0, 0, 1];
	result.flat
};

~bunrakuBone = { |name| ~bunrakuLatest[\bones][name.asSymbol] };
~bunrakuGroup = { |name|
	~bunrakuGroups[name.asSymbol].collect { |bone|
		[bone, ~bunrakuLatest[\bones][bone]]
	}
};
~bunrakuPostBone = { |name| [name, ~bunrakuBone.(name)].postln };
~bunrakuPostGroup = { |name| [name, ~bunrakuGroup.(name)].postln };

~startBunrakuReceiver = {
	OSCdef(\bunrakuFrame).free;
	thisProcess.openUDPPort(~bunrakuListenPort);
	OSCdef(\bunrakuFrame, { |msg|
		var previous;
		try {
			~bunrakuLatest = ~bunrakuParse.(msg);
			previous = ~bunrakuLastFrameBySource[~bunrakuLatest[\source]];
			if(previous.notNil and: { ~bunrakuLatest[\frameID] > (previous + 1) }) {
				~bunrakuMissingFrameCount = ~bunrakuMissingFrameCount
					+ (~bunrakuLatest[\frameID] - previous - 1);
			};
			~bunrakuLastFrameBySource[~bunrakuLatest[\source]] = ~bunrakuLatest[\frameID];
			~bunrakuFrameCount = ~bunrakuFrameCount + 1;
			~onBunrakuFrame.(~bunrakuLatest);
			if(~bunrakuPublishToAvatar) {
				NetAddr.localAddr.sendMsg(*~bunrakuBuildAvatarView.(~bunrakuLatest));
			};
			if(~bunrakuForwardToGodot) {
				~bunrakuGodotAdapter.sendMsg(*~bunrakuBuildWire.(~bunrakuLatest));
			};
		} { |error| ("Rejected Bunraku Frame: " ++ error).warn };
	}, ~bunrakuWireAddress, recvPort: ~bunrakuListenPort);
	"Bunraku receiver started on port %".format(~bunrakuListenPort).postln;
};

~stopBunrakuReceiver = { OSCdef(\bunrakuFrame).free };

// Connect the existing Avatar helpers to the named-joint compatibility view.
~enableBunrakuAvatar = {
	var avatarClass = \Avatar.asClass;
	if(avatarClass.isNil) {
		Error("Avatar class is not installed; repair the BuMoChi Extensions link").throw;
	};
	avatarClass.stop;
	avatarClass.enableRemote(~bunrakuAvatarAddress);
	"Avatar listens to %".format(~bunrakuAvatarAddress).postln;
};

// Convert one legacy /rokoko/ recording frame to Bunraku wire format.
// Useful for the SuperCollider playback -> Godot diagnostic route.
~legacyFrameToBunraku = { |legacy, source = "sc-playback", frameID = 0|
	var byName = IdentityDictionary.new;
	var avatar = legacy[2].asString;
	legacy[3..].clump(8).do { |record|
		if(record.size == 8) { byName[record[0].asSymbol] = record[1..7] };
	};
	[~bunrakuWireAddress, 1, avatar, source, frameID, legacy[1].asFloat]
	++ ~bunrakuAvatarBoneNames.collect { |name| byName[name] }.flat
};

~playLegacyToGodot = { |messages, rate = 30|
	Routine({
		messages.do { |message, index|
			~bunrakuGodotAdapter.sendMsg(*~legacyFrameToBunraku.(message, "sc-playback", index));
			(rate.reciprocal).wait;
		};
	}).play(SystemClock)
};

// Camera-free source for Test 3. It emits protocol-valid frames directly to
// BunrakuOSCDecoder.py on port 39538.
~playBunrakuTestPose = { |frames = 150, rate = 30|
	Routine({
		frames.do { |frameID|
			var phase = frameID / rate;
			var bones = IdentityDictionary.new;
			~bunrakuBoneNames.do { |name, index|
				var x = 0.0, y = 0.0, z = index * 0.0001;
				var qz = 0.0, qw = 1.0;
				if(name == \Hips) { x = sin(phase * 2) * 0.15; y = 1.0 };
				if([\LeftUpperArm, \RightUpperArm].includes(name)) {
					qz = sin(phase * 3) * 0.25 * if(name == \LeftUpperArm, { 1 }, { -1 });
					qw = (1 - qz.squared).max(0).sqrt;
				};
				bones[name] = [x, y, z, 0.0, 0.0, qz, qw];
			};
			~bunrakuGodotAdapter.sendMsg(*~bunrakuBuildWire.((
				version: 1, avatar: "BunrakuTestAvatar", source: "sc-test",
				frameID: frameID, timestamp: phase, bones: bones
			)));
			(rate.reciprocal).wait;
		};
	}).play(SystemClock)
};

~startBunrakuReceiver.();
)

// --------------------------- inspection examples ---------------------------
// ~bunrakuPostBone.(\Head);
// ~bunrakuPostGroup.(\leftArm);
// ~bunrakuPostGroup.(\upperBody);
// ~bunrakuLatest;                 // metadata and all named transforms

// Print the head once every 30 frames:
// ~onBunrakuFrame = { |frame|
//     if((frame[\frameID] % 30) == 0) { frame[\bones][\Head].postln };
// };

// Existing Avatar / Joint helper tests:
// ~enableBunrakuAvatar.();
// Avatar.valuesGui;
// Avatar.default.jointNames;
// Avatar.default.jointIO(\head);

// Forward incoming frames unchanged through the local Python decoder to Godot:
// ~bunrakuForwardToGodot = true;
// ~bunrakuForwardToGodot = false;

// Play an existing Avatar recording through the Python decoder to Godot:
// ~playLegacyToGodot.(Avatar.default.messages, 30);
// ~playBunrakuTestPose.(); // deterministic Test 3 without a recording

// Stop:
// ~stopBunrakuReceiver.();
