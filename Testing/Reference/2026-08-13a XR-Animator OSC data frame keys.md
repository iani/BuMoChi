
The 147 numerical values are 21 consecutive bone transforms, each containing:

```
x, y, z, qx, qy, qz, qw
```

The bone identity is defined by its fixed position in the Bunraku Frame protocol. Bone-name strings are deliberately omitted from every frame to keep the OSC message below 1200 bytes.

Do not insert bone names into the transmitted message: that would change protocol v1 and could exceed the packet limit. SuperCollider should associate names with the fixed positions.

## Bunraku Frame key

The complete OSC message layout is:

|SC index|Meaning|
|---|---|
|`0`|`/bunraku/vmc/frame`|
|`1`|Protocol version|
|`2`|Avatar name|
|`3`|Source identity|
|`4`|Frame ID|
|`5`|Encoder timestamp|
|`6–152`|21 × 7 bone values|

The bone ranges are:

|Bone|Transform indices|
|---|---|
|Hips|`6–12`|
|Spine|`13–19`|
|Chest|`20–26`|
|Neck|`27–33`|
|Head|`34–40`|
|LeftShoulder|`41–47`|
|LeftUpperArm|`48–54`|
|LeftLowerArm|`55–61`|
|LeftHand|`62–68`|
|RightShoulder|`69–75`|
|RightUpperArm|`76–82`|
|RightLowerArm|`83–89`|
|RightHand|`90–96`|
|LeftUpperLeg|`97–103`|
|LeftLowerLeg|`104–110`|
|LeftFoot|`111–117`|
|LeftToes|`118–124`|
|RightUpperLeg|`125–131`|
|RightLowerLeg|`132–138`|
|RightFoot|`139–145`|
|RightToes|`146–152`|

Within every range:

|Offset|Value|
|---|---|
|`0`|x|
|`1`|y|
|`2`|z|
|`3`|qx|
|`4`|qy|
|`5`|qz|
|`6`|qw|

## SuperCollider lookup key

```
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
```

## Retrieve one bone from a recorded frame

A recording entry has this structure:

```
[recordingTime, oscMessage]
```

Use:

```
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
```

Examples:

```
~boneFromRecordedFrame.(
    OscRecorder.default.sessionData[100],
    \Head
);
```

```
~boneFromRecordedFrame.(
    OscRecorder.default.sessionData[100],
    \LeftHand
);
```

The result is:

```
[x, y, z, qx, qy, qz, qw]
```

## Convert a frame to named bones

```
~namedBonesFromRecordedFrame = { |entry|
    var message = entry[1];
    var bones = IdentityDictionary.new;

    ~bunrakuBoneNames.do { |boneName, boneIndex|
        var start = 6 + (boneIndex * 7);
        bones[boneName] = message.copyRange(start, start + 6);
    };

    bones;
};
```

Usage:

```
~frameBones = ~namedBonesFromRecordedFrame.(
    OscRecorder.default.sessionData[100]
);

~frameBones[\Head];
~frameBones[\LeftHand];
~frameBones[\Hips];
```

## Substitute a bone from another recording

This takes the overall frame from `targetEntry` and replaces one bone with the same bone from `donorEntry`:

```
~replaceRecordedBone = { |targetEntry, donorEntry, boneName|
    var result = targetEntry[1].copy;
    var donor = donorEntry[1];
    var boneIndex = ~bunrakuBoneNames.indexOfEqual(boneName.asSymbol);
    var start;

    if(boneIndex.isNil) {
        Error("Unknown Bunraku bone: %".format(boneName)).throw;
    };

    start = 6 + (boneIndex * 7);

    7.do { |offset|
        result[start + offset] = donor[start + offset];
    };

    // Preserve the target recording time while returning a valid entry.
    [targetEntry[0], result];
};
```

Example:

```
~combinedFrame = ~replaceRecordedBone.(
    ~recordingA[100], // base pose
    ~recordingB[250], // donor pose
    \LeftHand
);
```

The resulting OSC message remains a valid 153-element Bunraku Frame and can be sent directly to `BunrakuOSCDecoder`. This fixed-position key is the basis for Bunraku-style bone and body-part recombination.
