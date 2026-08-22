BmcBoneSets {
	*leftArm { ^#[\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand] }
	*rightArm { ^#[\RightShoulder, \RightUpperArm, \RightLowerArm, \RightHand] }
	*arms { ^this.leftArm ++ this.rightArm }
	*leftLeg { ^#[\LeftUpperLeg, \LeftLowerLeg, \LeftFoot, \LeftToes] }
	*rightLeg { ^#[\RightUpperLeg, \RightLowerLeg, \RightFoot, \RightToes] }
	*legs { ^this.leftLeg ++ this.rightLeg }
	*torso { ^#[\Hips, \Spine, \Chest, \Neck, \Head] }
	*upperBody { ^this.torso ++ this.arms }
	*all { ^Bmc.boneNames }

	*resolve { |bones|
		var selector;
		if(bones.isKindOf(Symbol) or: { bones.isKindOf(String) }) {
			selector = bones.asSymbol;
			if(this.respondsTo(selector)) { ^this.perform(selector) };
			^[selector]
		};
		^bones
	}
}
