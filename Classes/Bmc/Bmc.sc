// Bunraku-Mocap-Copy: fixed-frame bone selection and merging.
//
// Bmc(target, source, bones) returns a copy of target in which the selected
// 7-value transforms have been replaced by values from source. Both arguments
// may be raw /bunraku/vmc/frame messages or OscRecorder session entries of the
// form [recordingTime, message]. The input objects are never modified.

Bmc {
	classvar <boneNames;

	*initClass {
		boneNames = #[
			\Hips, \Spine, \Chest, \Neck, \Head,
			\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand,
			\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand,
			\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes,
			\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes
		];
	}

	// This utility class returns the merged data directly; it has no instance.
	*new { |target, source, bones|
		^this.combine(target, source, bones)
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
			var start = this.boneStart(bone);
			7.do { |offset|
				result[start + offset] = sourceMessage[start + offset];
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
		start = this.boneStart(boneName);
		^message.copyRange(start, start + 6)
	}

	*boneStart { |boneName|
		var normalized = boneName.asSymbol;
		var index = boneNames.indexOfEqual(normalized);
		if(index.isNil) {
			Error("Bmc: unknown bone %, expected one of %"
				.format(boneName, boneNames)).throw;
		};
		^6 + (index * 7)
	}

	*normalizeBones { |bones|
		if(bones.isNil) { Error("Bmc: bones cannot be nil").throw };
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
		if(message.size != 153) {
			Error("Bmc: % message has % elements; expected 153"
				.format(role, message.size)).throw;
		};
		if(message[0].asString != "/bunraku/vmc/frame") {
			Error("Bmc: % has OSC address %, expected /bunraku/vmc/frame"
				.format(role, message[0])).throw;
		};
		if(message[1].asInteger != 1) {
			Error("Bmc: % uses unsupported protocol version %"
				.format(role, message[1])).throw;
		};
	}
}
