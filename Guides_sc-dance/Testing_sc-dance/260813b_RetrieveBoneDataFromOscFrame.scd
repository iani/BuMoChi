//: 1. Bunraku Bone Names
~bunrakuBoneNames = [
    \Hips,
    \Spine,
    \Chest,
    \Neck,
    \Head,

    \LeftShoulder,
    \LeftUpperArm,
    \LeftLowerArm,
    \LeftHand,

    \RightShoulder,
    \RightUpperArm,
    \RightLowerArm,
    \RightHand,

    \LeftUpperLeg,
    \LeftLowerLeg,
    \LeftFoot,
    \LeftToes,

    \RightUpperLeg,
    \RightLowerLeg,
    \RightFoot,
    \RightToes
];

//: 2. Obtaining the values for a given bone from a frame entry
~boneFromRecordedFrame = { |entry, boneName|
    var message = entry[1];
    var boneIndex = ~bunrakuBoneNames.indexOfEqual(boneName.asSymbol);
    var start;

    if(boneIndex.isNil) {
        Error("Unknown Bunraku bone: %".format(boneName)).throw;
    };

    start = 6 + (boneIndex * 7);
    message.copyRange(start, start + 6);
};
//: Get the first recorded frame
~frame0 = OscRecorder.default.recordedData.first;
//: Get the data for \Hips

~boneFromRecordedFrame.(~frame0, \Hips)
