// Tests startup-style discovery, the unified catalog, and lazy clip loading.
(
var assert = { |condition, message|
	if(condition.not) { Error("FAIL: " ++ message).throw };
};
var oldDirectory = Bmc.clipDirectory;
var testDirectory = "/tmp" +/+ "BmcSavedClipsTests";
var testPath = testDirectory +/+ "lazyTake.scd";
var message = BmcFrame("TestAvatar", "test", 0, 0.0, BmcPose.neutral).asOSCMessage;
var names, placeholder, loaded;

if(File.exists(testDirectory).not) { File.mkdir(testDirectory) };
if(File.exists(testPath)) { File.delete(testPath) };
BmcMocapClip([[0.0, message]], (), \lazyTake).writeScd(testPath);

protect {
	Bmc.clipDirectory_(testDirectory);
	assert.(Bmc.clipDirectory == testDirectory.standardizePath,
		"clipDirectory_ should update the library default directory");
	assert.(Bmc.postClipDirectory == Bmc.clipDirectory,
		"postClipDirectory should return the directory");

	names = Bmc.savedClips;
	assert.(names == [\lazyTake], "savedClips should discover the SCD file");
	assert.(Bmc.listSavedClips == names,
		"listSavedClips should return the same names as savedClips");

	placeholder = Bmc.clips[\lazyTake];
	assert.(placeholder.isKindOf(BmcClip), "catalog values should always be BmcClip objects");
	assert.(placeholder.frames.isNil, "a discovered clip should initially be unloaded");
	assert.(placeholder.path == testPath.standardizePath, "placeholder should retain its disk path");

	loaded = Bmc.clip(\lazyTake);
	assert.(loaded.isKindOf(BmcMocapClip), "first access should load the stored clip subclass");
	assert.(loaded.frames.notNil and: { loaded.size == 1 }, "lazy loading should populate frame data");
	assert.(Bmc.clips[\lazyTake] === loaded, "loaded clip should replace the placeholder");
} {
	Bmc.clipDirectory_(oldDirectory);
	if(File.exists(testPath)) { File.delete(testPath) };
};

"PASS: Bmc saved clip discovery tests".postln;
0.exit;
)
