BmcTakeRecordingPath {
	var <directory, <basename, <audioPath, <videoPath, <metadataPath, <screenStatePath;
	classvar defaultDirectory;

	*preferencePath {
		^Platform.userAppSupportDir +/+ "video_recording_folder.scd"
	}

	*defaultDirectory {
		^this.recordingDirectory
	}

	*recordingDirectory {
		var data;
		if(defaultDirectory.notNil) { ^defaultDirectory };
		if(File.exists(this.preferencePath)) {
			data = File.readAllString(this.preferencePath).interpret;
			defaultDirectory = if(data.isKindOf(Dictionary)) {
				data[\videoRecordingFolder]
			} {
				data
			};
			if(defaultDirectory.isString.not) {
				Error("Invalid Bmc video recording preference: %"
					.format(this.preferencePath)).throw
			};
			defaultDirectory = defaultDirectory.standardizePath;
		} {
			defaultDirectory = Platform.userAppSupportDir +/+ "Recordings";
			this.writePreference
		};
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

	sanitize { |string|
		var result = string.collect { |character|
			if(character.isAlphaNum or: { "_-".includes(character) }) { character } { $_ }
		};
		if(result.isEmpty) { Error("Bmc take name is empty after sanitizing").throw };
		^result
	}
}
