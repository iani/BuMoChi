//: PRototype for combining frame data from 2 sources:
//: terminology, names:
/*
Bmc: (short for Bunraku-Mocap-Copy): The name of the class
method that performs edit operations. It will have several different
editing methods. 

*/

Basic editing methods:

Bmc(target, source, bones) where:
target: The frame data that will be edited (replaced by data from source).
source: The frame data that will be copied into the target frame.
bones: an array of bone names, for example:
[  \LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand]
alternatively a single bone name, for example:
\Hips 
//: Array of Bone Names:

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

