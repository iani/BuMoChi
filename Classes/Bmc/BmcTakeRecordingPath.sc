BmcTakeRecordingPath {
	var <directory, <basename, <audioPath, <videoPath, <metadataPath, <screenStatePath;
	var <sourceClipPath, <sourceClipOriginalPath, <sourceClipArchiveMode;
	classvar defaultDirectory;

	*preferencePath {
		^Platform.userAppSupportDir +/+ "video_recording_folder.scd"
	}

	*defaultDirectory {
		^this.recordingDirectory
	}

	*recordingDirectory {
		if(defaultDirectory.notNil) { ^defaultDirectory };
		defaultDirectory = BmcDataFolder.videos;
		^defaultDirectory
	}

	*recordingDirectory_ { |path|
		if(path.isNil) { Error("Bmc video recording folder cannot be nil").throw };
		path = path.asString.standardizePath;
		if(File.exists(path).not) {
			if(File.mkdir(path).not) {
				Error("Could not create Bmc video recording folder: %".format(path)).throw
			}
		};
		if(File.type(path) != \directory) {
			Error("Bmc video recording folder is not a directory: %".format(path)).throw
		};
		defaultDirectory = path;
		this.writePreference;
		"Bmc video recordings will be stored in: %".format(path).postln;
		^defaultDirectory
	}

	*writePreference {
		var file = File(this.preferencePath, "w");
		if(file.isOpen.not) {
			Error("Could not write Bmc video recording preference: %"
				.format(this.preferencePath)).throw
		};
		protect {
			file.putString((videoRecordingFolder: defaultDirectory).asCompileString);
			file.putString("\n");
		} {
			file.close
		};
		^this.preferencePath
	}

	*new { |clipName| ^super.new.init(clipName) }

	init { |clipName|
		var root = this.class.defaultDirectory.standardizePath;
		var safeName = this.sanitize(clipName.asString);
		var timestamp = Date.localtime.stamp.replace("_", "");
		var candidate, suffix = 1;
		if(File.exists(root).not) {
			if(File.mkdir(root).not) {
				Error("Bmc recording folder is unavailable: %".format(root)).throw
			}
		};
		if(File.type(root) != \directory) {
			Error("Bmc recording folder is not a directory: %".format(root)).throw
		};
		basename = safeName ++ "_" ++ timestamp;
		candidate = root +/+ basename;
		while { File.exists(candidate) } {
			suffix = suffix + 1;
			candidate = root +/+ (basename ++ "_" ++ suffix);
		};
		directory = candidate;
		basename = PathName(directory).fileName;
		if(File.mkdir(directory).not) {
			Error("Could not create Bmc take directory: %".format(directory)).throw
		};
		audioPath = directory +/+ (basename ++ ".wav");
		videoPath = directory +/+ (basename ++ ".mp4");
		metadataPath = directory +/+ (basename ++ ".scd");
		screenStatePath = directory +/+ ".screen-capture.json";
		^this
	}

	archiveSourceClip { |clip, clipName|
		var originalPath = clip.path;
		if(originalPath.notNil and: { File.exists(originalPath.standardizePath) }) {
			sourceClipOriginalPath = originalPath.standardizePath;
			if(File.type(sourceClipOriginalPath) != \regular) {
				Error("The source clip path is not a file: %"
					.format(sourceClipOriginalPath)).throw
			};
			sourceClipPath = directory +/+ PathName(sourceClipOriginalPath).fileName;
			if(File.copy(sourceClipOriginalPath, sourceClipPath).not) {
				Error("Could not copy source clip into take directory: %"
					.format(sourceClipOriginalPath)).throw
			};
			sourceClipArchiveMode = \copiedOriginal;
		} {
			sourceClipOriginalPath = nil;
			sourceClipPath = directory +/+ (this.sanitize(clipName.asString) ++ ".scd");
			clip.writeScd(sourceClipPath);
			sourceClipArchiveMode = \serializedSnapshot;
		};
		^sourceClipPath
	}

	sanitize { |string|
		var result = string.collect { |character|
			if(character.isAlphaNum or: { "_-".includes(character) }) { character } { $_ }
		};
		if(result.isEmpty) { Error("Bmc take name is empty after sanitizing").throw };
		^result
	}
}
