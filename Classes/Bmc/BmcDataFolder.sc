BmcDataFolder {
	classvar rootDirectory;

	*preferencePath {
		^Platform.userAppSupportDir +/+ "bumochi_data_folder.scd"
	}

	*defaultRoot {
		^Platform.userAppSupportDir +/+ "BuMoChi_Data"
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

	*clips { ^this.root +/+ "Clips" }
	*videos { ^this.root +/+ "Videos" }
	*sequences { ^this.root +/+ "Sequences" }

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
		this.ensureDirectory(rootDirectory +/+ "Clips");
		this.ensureDirectory(rootDirectory +/+ "Videos");
		this.ensureDirectory(rootDirectory +/+ "Sequences");
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
