BmcPose {
	var <bones;

	*new { |bones| ^super.new.init(bones) }

	*fromOSC { |message|
		var result = IdentityDictionary.new;
		Bmc.validateMessage(message);
		Bmc.boneNames.do { |name|
			result[name] = BmcBoneTransform(Bmc.bone(message, name));
		};
		^this.new(result)
	}

	*neutral {
		var result = IdentityDictionary.new;
		Bmc.boneNames.do { |name|
			result[name] = BmcBoneTransform([0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
		};
		^this.new(result)
	}

	*humanoidNeutral { ^this.neutral }

	init { |argBones|
		bones = IdentityDictionary.new;
		(argBones ?? { IdentityDictionary.new }).keysValuesDo { |name, transform|
			this.put(name, transform);
		};
		^this
	}

	at { |name| ^bones[name.asSymbol] }
	put { |name, transform|
		if(transform.isKindOf(BmcBoneTransform).not) {
			transform = BmcBoneTransform(transform);
		};
		bones[name.asSymbol] = transform.copy;
		^this
	}

	copyBonesFrom { |sourcePose, selectedBones|
		BmcBoneSets.resolve(selectedBones).do { |name|
			var transform = sourcePose.at(name);
			if(transform.notNil) { this.put(name, transform) };
		};
		^this
	}

	fillMissingFrom { |referencePose|
		Bmc.boneNames.do { |name|
			if(this.at(name).isNil and: { referencePose.at(name).notNil }) {
				this.put(name, referencePose.at(name));
			};
		};
		^this
	}

	missingBones { ^Bmc.boneNames.select { |name| this.at(name).isNil } }
	isComplete { ^this.missingBones.isEmpty }

	asValues {
		^Bmc.boneNames.collect { |name|
			var transform = this.at(name);
			if(transform.isNil) {
				Error("BmcPose is missing bone %".format(name)).throw;
			};
			transform.asArray
		}.flat
	}

	copy { ^this.class.new(bones) }
}
