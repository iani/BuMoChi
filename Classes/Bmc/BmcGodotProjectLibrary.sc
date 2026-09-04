BmcGodotProjectLibrary {
	*directory { ^BmcDataFolder.projects }

	*projectFolders {
		var root = PathName(this.directory);
		if(root.isFolder.not) { ^#[] };
		^root.folders.select { |folder|
			File.exists(folder.fullPath +/+ "project.godot")
		}.sort { |a, b| a.folderName.toLower < b.folderName.toLower }
	}

	*projectNames {
		^this.projectFolders.collect { |folder| folder.folderName.asSymbol }
	}

	*projectPath { |name|
		var symbol = name.asSymbol;
		var path;
		var folder = this.projectFolders.detect { |item|
			item.folderName.asSymbol == symbol
		};
		if(folder.isNil) { Error("Unknown Godot project: %".format(name)).throw };
		path = folder.fullPath.standardizePath;
		if(path.last == $/) { path = path.drop(-1) };
		^path
	}

	*tscnFilesIn { |folder, recursive = false|
		var pathName = PathName(folder);
		var files;
		if(pathName.isFolder.not) { ^#[] };
		files = if(recursive) { pathName.deepFiles } { pathName.files };
		^files.select { |file| file.extension.asString.toLower == "tscn" }
	}

	*scenePaths { |projectName|
		var projectPath = this.projectPath(projectName);
		var files = this.tscnFilesIn(projectPath, false)
			++ this.tscnFilesIn(projectPath +/+ "scenes", true);
		^files.collect { |file|
			var fullPath = file.fullPath.standardizePath;
			"res://" ++ fullPath.copyRange(projectPath.size + 1, fullPath.size - 1)
		}.sort
	}

	*projectInfo { |name|
		var projectPath = this.projectPath(name);
		var scenes = this.scenePaths(name);
		^(
			name: name.asSymbol,
			path: projectPath,
			projectFile: projectPath +/+ "project.godot",
			scenes: scenes,
			hasScenes: scenes.notEmpty,
			vmcValidated: false
		)
	}

	*allProjectInfo {
		^this.projectNames.collect { |name| this.projectInfo(name) }
	}
}
