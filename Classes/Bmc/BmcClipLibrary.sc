BmcClipLibrary {
	var <clips, <currentName, <paths;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = Platform.userAppSupportDir +/+ "BmcClips"
		}
	}

	*new { ^super.new.init }

	init {
		clips = IdentityDictionary.new;
		paths = IdentityDictionary.new;
		^this
	}

	add { |name, clip, path|
		if(clip.isKindOf(BmcClip).not) {
			Error("BmcClipLibrary can only store BmcClip objects").throw;
		};
		name = name ?? { this.nextName };
		name = name.asSymbol;
		clips[name] = clip;
		if(path.isNil) {
			paths.removeAt(name);
		} {
			paths[name] = path.standardizePath;
		};
		currentName = name;
		^clip
	}

	nextName {
		var index = clips.size + 1;
		while { clips.includesKey(("clip" ++ index).asSymbol) } { index = index + 1 };
		^("clip" ++ index).asSymbol
	}

	at { |name|
		if(name.isNil) { ^this.current };
		^clips[name.asSymbol]
	}

	current { ^if(currentName.isNil) { nil } { clips[currentName] } }
	select { |name|
		name = name.asSymbol;
		if(clips.includesKey(name).not) {
			Error("Unknown Bmc clip: %".format(name)).throw;
		};
		currentName = name;
		^clips[name]
	}

	names { ^clips.keys.asArray.sort }
	savedNames {
		var directory = PathName(this.class.defaultDirectory);
		if(directory.isFolder.not) { ^[] };
		^directory.files.select { |file|
			file.extension.asString.toLower == "bmc"
		}.collect { |file|
			file.fileNameWithoutExtension.asSymbol
		}.sort
	}
	size { ^clips.size }

	remove { |name|
		var result;
		name = name.asSymbol;
		result = clips.removeAt(name);
		paths.removeAt(name);
		if(currentName == name) { currentName = clips.keys.asArray.first };
		^result
	}

	rename { |oldName, newName|
		var clip = this.at(oldName);
		var path = paths[oldName.asSymbol];
		if(clip.isNil) { Error("Unknown Bmc clip: %".format(oldName)).throw };
		this.remove(oldName);
		^this.add(newName, clip, path)
	}

	clear {
		clips.clear;
		paths.clear;
		currentName = nil;
		^this
	}

	load { |path, name|
		var clip = BmcClip.read(path);
		^this.add(name ?? { PathName(path).fileNameWithoutExtension.asSymbol }, clip, path)
	}

	defaultPathFor { |name|
		if(File.exists(this.class.defaultDirectory).not) {
			File.mkdir(this.class.defaultDirectory);
		};
		^this.class.defaultDirectory +/+ (name.asString ++ ".bmc")
	}

	save { |name, path|
		var clip = this.at(name);
		if(clip.isNil) { Error("No Bmc clip selected").throw };
		name = name ?? { currentName };
		path = path ?? { this.defaultPathFor(name) };
		clip.write(path);
		paths[name.asSymbol] = path.standardizePath;
		^path
	}

	pathFor { |name|
		name = name ?? { currentName };
		if(name.isNil) { ^nil };
		^paths[name.asSymbol] ?? { this.defaultPathFor(name) }
	}

	exportScd { |name|
		var clip;
		var bmcPath, scdPath, pathName;
		name = name ?? { currentName };
		if(name.isNil) { Error("No Bmc clip name supplied or selected").throw };
		clip = this.at(name);
		if(clip.isNil) {
			bmcPath = this.defaultPathFor(name);
			if(File.exists(bmcPath).not) {
				Error("Unknown Bmc clip %, and no file exists at %"
					.format(name, bmcPath)).throw;
			};
			clip = this.load(bmcPath, name);
		};
		bmcPath = this.pathFor(name);
		pathName = PathName(bmcPath);
		scdPath = pathName.pathOnly +/+ (pathName.fileNameWithoutExtension ++ ".scd");
		^clip.writeScd(scdPath)
	}

	list {
		if(clips.isEmpty) { "Bmc: no clips".postln } {
			this.names.do { |name|
				var clip = clips[name];
				postf("%%: % frames, % seconds\n",
					if(name == currentName) { "* " } { "  " },
					name, clip.size, clip.duration.round(0.001));
			};
		};
		^this.names
	}

	show {
		{
			var window = Window("Bmc Clips", Rect(200, 200, 520, 300));
			var view = ListView();
			var listSavedButton = Button().states_([["List saved"]]);
			var playButton = Button().states_([["Play selected"]]);
			var displayedNames, selectedName, showingSaved = false, refresh;

			refresh = {
				displayedNames = if(showingSaved) { this.savedNames } { this.names };
				view.items = displayedNames.collect { |name|
					var clip = clips[name];
					if(clip.isNil) {
						"% — saved on disk".format(name)
					} {
						"% — % frames — % s".format(
							name, clip.size, clip.duration.round(0.001)
						)
					}
				};
				selectedName = if(displayedNames.includes(currentName)) {
					currentName
				} {
					displayedNames.first
				};
				if(selectedName.notNil) {
					view.value = displayedNames.indexOfEqual(selectedName);
				};
			};

			view.action = { |list|
				if(displayedNames.notEmpty) {
					selectedName = displayedNames[list.value];
					if(clips.includesKey(selectedName)) { this.select(selectedName) };
				};
			};
			listSavedButton.action = {
				showingSaved = true;
				refresh.value;
			};
			playButton.action = {
				if(selectedName.isNil) {
					"Bmc: select a clip to play".warn;
				} {
					if(clips.includesKey(selectedName).not) {
						this.load(this.defaultPathFor(selectedName), selectedName);
					};
					Bmc.play(selectedName);
					refresh.value;
				};
			};

			window.view.layout = VLayout(
				HLayout(listSavedButton, playButton, nil),
				view
			);
			refresh.value;
			window.front;
		}.defer;
		^this
	}
}
