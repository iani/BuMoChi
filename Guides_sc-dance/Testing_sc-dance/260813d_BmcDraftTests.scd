// Draft tests for Bmc. Recompile the class library before evaluating.
(
var check, makeFrame, target, source, merged, entryMerged, leftArm;
var targetSequence, sourceSequence, mergedSequence;

check = { |condition, failureMessage|
	if(condition.not) { Error("FAIL: " ++ failureMessage).throw };
};

makeFrame = { |fill, frameID|
	['/bunraku/vmc/frame', 1, 'BunrakuTestAvatar', 'bmc-test', frameID, 0.0]
	++ Array.fill(147, fill)
};

target = makeFrame.(0.0, 10);
source = makeFrame.(1.0, 20);
leftArm = [\LeftShoulder, \LeftUpperArm, \LeftLowerArm, \LeftHand];
merged = Bmc(target, source, leftArm);

// Inputs remain untouched; target metadata remains the target metadata.
check.(target[41] == 0.0, "Bmc modified its target input");
check.(source[41] == 1.0, "Bmc modified its source input");
check.(merged[4] == 10, "Bmc did not preserve target metadata");

// All requested left-arm blocks came from source.
leftArm.do { |bone|
	check.(Bmc.bone(merged, bone) == Array.fill(7, 1.0),
		"Bmc failed to copy %".format(bone));
};

// A bone outside the subset remains from target.
check.(Bmc.bone(merged, \Head) == Array.fill(7, 0.0),
	"Bmc changed an unrequested bone");

// A timed frame entry preserves its outer recording time.
entryMerged = Bmc([12.5, target], [99.0, source], \Hips);
check.(entryMerged[0] == 12.5, "Bmc did not preserve target recording time");
check.(Bmc.bone(entryMerged, \Hips) == Array.fill(7, 1.0),
	"Bmc failed to copy a single bone in a timed frame entry");

// Replace two source frames within a four-frame target sequence, starting at 1.
targetSequence = 4.collect { |index| [index.asFloat, makeFrame.(0.0, index)] };
sourceSequence = 2.collect { |index| [100.0 + index, makeFrame.(index + 1.0, 50 + index)] };
mergedSequence = Bmc.rseq(targetSequence, sourceSequence, \Head, 1);

check.(mergedSequence.size == 4, "Bmc.rseq changed the target sequence length");
check.(Bmc.bone(mergedSequence[0], \Head) == Array.fill(7, 0.0),
	"Bmc.rseq changed a frame before startIndex");
check.(Bmc.bone(mergedSequence[1], \Head) == Array.fill(7, 1.0),
	"Bmc.rseq failed to copy source frame 0");
check.(Bmc.bone(mergedSequence[2], \Head) == Array.fill(7, 2.0),
	"Bmc.rseq failed to copy source frame 1");
check.(Bmc.bone(mergedSequence[3], \Head) == Array.fill(7, 0.0),
	"Bmc.rseq changed a frame after the replacement interval");
check.(mergedSequence[1][0] == 1.0,
	"Bmc.rseq did not preserve the target frame's recording time");
check.(mergedSequence[1][1][4] == 1,
	"Bmc.rseq did not preserve the target frame's metadata");

"Single-frame merge data:".postln;
[
	[\targetHead, Bmc.bone(target, \Head)],
	[\sourceHead, Bmc.bone(source, \Head)],
	[\mergedHead, Bmc.bone(merged, \Head)],
	[\mergedFrame, merged]
].postln;

"Sequence merge data (recording time, frame ID, Head):".postln;
mergedSequence.do { |entry|
	[entry[0], entry[1][4], Bmc.bone(entry, \Head)].postln;
};

"PASS: Bmc draft tests".postln;
)
