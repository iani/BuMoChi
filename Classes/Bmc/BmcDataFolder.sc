BmcDataFolder {
	classvar rootDirectory;

	*preferencePath {
		^Platform.userAppSupportDir +/+ "bumochi_data_folder.scd"
	}

	*defaultRoot {
		^Platform.userAppSupportDir +/+ "BuMoChiAssets"
	}

	*root {
		var data;
		if(rootDirectory.notNil) { ^rootDirectory };
		rootDirectory = this.defaultRoot.standardizePath;
		if(File.exists(this.preferencePath)) {
			data = File.readAllString(this.preferencePath).interpret;
			if(data.isKindOf(Dictionary) and: { data[\dataFolder].isString }) {
				rootDirectory = data[\dataFolder].standardizePath
			} {
				"Bmc: ignoring invalid data-folder preference at %"
					.format(this.preferencePath).warn
			}
		};
		this.ensureDirectories;
		^rootDirectory
	}

	*root_ { |path|
		if(path.isNil) { Error("Bmc data folder cannot be nil").throw };
		rootDirectory = path.asString.standardizePath;
		this.ensureDirectories;
		this.writePreference;
		^rootDirectory
	}

	*animationClips { ^this.root +/+ "AnimationClips" }
	*animationScripts { ^this.root +/+ "AnimationScripts" }
	*videos { ^this.root +/+ "Videos" }
	*scores { ^this.root +/+ "Scores" }
	*godotProjects { ^this.root +/+ "GodotProjects" }
	*soundFiles { ^this.root +/+ "SoundFiles" }
	*soundScripts { ^this.root +/+ "SoundScripts" }

	// Compatibility shortcuts for the former asset names.
	*clips { ^this.animationClips }
	*sequences { ^this.scores }
	*projects { ^this.godotProjects }

	*ensureDirectory { |path|
		if(File.exists(path).not and: { File.mkdir(path).not }) {
			Error("Could not create Bmc data directory: %".format(path)).throw
		};
		if(File.type(path) != \directory) {
			Error("Bmc data path is not a directory: %".format(path)).throw
		};
		^path
	}

	*ensureDirectories {
		this.ensureDirectory(rootDirectory);
		this.ensureDirectory(rootDirectory +/+ "AnimationClips");
		this.ensureDirectory(rootDirectory +/+ "AnimationScripts");
		this.ensureDirectory(rootDirectory +/+ "Videos");
		this.ensureDirectory(rootDirectory +/+ "Scores");
		this.ensureDirectory(rootDirectory +/+ "GodotProjects");
		this.ensureDirectory(rootDirectory +/+ "SoundFiles");
		this.ensureDirectory(rootDirectory +/+ "SoundScripts");
		^rootDirectory
	}

	*writePreference {
		var file = File(this.preferencePath, "w");
		if(file.isOpen.not) {
			Error("Could not write Bmc data-folder preference: %"
				.format(this.preferencePath)).throw
		};
		protect {
			file.putString((dataFolder: rootDirectory).asCompileString);
			file.putString("\n");
		} {
			file.close
		};
		^this.preferencePath
	}
}
