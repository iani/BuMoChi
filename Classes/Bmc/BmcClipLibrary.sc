BmcClipLibrary {
	var <clips, <currentName;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = BmcDataFolder.clips
		}
	}
	*defaultDirectory_ { |path|
		if(path.isNil) { Error("BmcClipLibrary default directory cannot be nil").throw };
		defaultDirectory = path.standardizePath;
		^defaultDirectory
	}

	*new { ^super.new.init }

	init {
		clips = IdentityDictionary.new;
		this.refreshSaved;
		^this
	}

	add { |name, clip, path|
		if(clip.isKindOf(BmcClip).not) {
			Error("BmcClipLibrary can only store BmcClip objects").throw;
		};
		name = name ?? { this.nextName };
		name = name.asSymbol;
		clip.name_(name);
		clip.path_(path ?? { clip.path });
		clips[name] = clip;
		currentName = name;
		^clip
	}

	nextName {
		var index = clips.size + 1;
		while { clips.includesKey(("clip" ++ index).asSymbol) } { index = index + 1 };
		^("clip" ++ index).asSymbol
	}

	at { |name|
		var clip;
		if(name.isNil) { ^this.current };
		name = name.asSymbol;
		clip = clips[name];
		if(clip.notNil and: { clip.isLoaded.not }) {
			clip = this.load(clip.path, name);
		};
		^clip
	}

	current { ^if(currentName.isNil) { nil } { this.at(currentName) } }
	select { |name|
		name = name.asSymbol;
		if(clips.includesKey(name).not) {
			Error("Unknown Bmc clip: %".format(name)).throw;
		};
		currentName = name;
		^this.at(name)
	}

	names { ^clips.keys.asArray.sort }
	savedNames {
		^clips.keys.select { |key| clips[key].path.notNil }.asArray.sort
	}

	refreshSaved {
		var directory = PathName(this.class.defaultDirectory);
		var found = IdentityDictionary.new;
		// Loaded and generated clips survive rescans; unloaded placeholders do not.
		clips.keysValuesDo { |key, clip| if(clip.isLoaded) { found[key] = clip } };
		if(directory.isFolder) {
			directory.files.do { |file|
				var extension = file.extension.asString.toLower.asSymbol;
				var key = file.fileNameWithoutExtension.asSymbol;
				var existing = found[key];
				if([\bmc, \scd].includes(extension)) {
					if(existing.isNil or: { existing.isLoaded.not and: { extension == \scd } }) {
						found[key] = BmcClip(nil, (), key, file.fullPath);
					} {
						if(existing.path.isNil) { existing.path_(file.fullPath) };
					};
				};
			};
		};
		clips = found;
		if(currentName.notNil and: { clips.includesKey(currentName).not }) { currentName = nil };
		^this.names
	}

	savedPathFor { |name|
		var catalogClip = clips[name.asSymbol];
		var bmcPath = this.defaultPathFor(name);
		var scdPath = this.defaultScdPathFor(name);
		if(catalogClip.notNil and: { catalogClip.path.notNil }) { ^catalogClip.path };
		if(File.exists(scdPath)) { ^scdPath };
		if(File.exists(bmcPath)) { ^bmcPath };
		^nil
	}
	size { ^clips.size }

	remove { |name|
		var result;
		name = name.asSymbol;
		result = clips.removeAt(name);
		if(currentName == name) { currentName = clips.keys.asArray.first };
		^result
	}

	rename { |oldName, newName|
		var clip = this.at(oldName);
		var path = clip !? _.path;
		if(clip.isNil) { Error("Unknown Bmc clip: %".format(oldName)).throw };
		this.remove(oldName);
		^this.add(newName, clip, path)
	}

	clear {
		clips.clear;
		currentName = nil;
		^this
	}

	load { |path, name|
		var clip = BmcClip.read(path);
		^this.add(name ?? { PathName(path).fileNameWithoutExtension.asSymbol }, clip, path)
	}

	loadScd { |path, name|
		var clip = BmcClip.readScd(path);
		^this.add(name ?? { PathName(path).fileNameWithoutExtension.asSymbol }, clip, path)
	}

	defaultPathFor { |name|
		if(File.exists(this.class.defaultDirectory).not) {
			File.mkdir(this.class.defaultDirectory);
		};
		^this.class.defaultDirectory +/+ (name.asString ++ ".bmc")
	}

	defaultScdPathFor { |name|
		if(File.exists(this.class.defaultDirectory).not) {
			File.mkdir(this.class.defaultDirectory);
		};
		^this.class.defaultDirectory +/+ (name.asString ++ ".scd")
	}

	save { |name, path|
		var clip = this.at(name);
		if(clip.isNil) { Error("No Bmc clip selected").throw };
		name = name ?? { currentName };
		path = path ?? { this.defaultPathFor(name) };
		clip.write(path);
		clip.path_(path);
		^path
	}

	saveScd { |name, path|
		var clip = this.at(name);
		if(clip.isNil) { Error("No Bmc clip selected").throw };
		name = name ?? { currentName };
		path = path ?? { this.defaultScdPathFor(name) };
		clip.writeScd(path);
		clip.path_(path);
		^path
	}

	pathFor { |name|
		var clip;
		name = name ?? { currentName };
		if(name.isNil) { ^nil };
		clip = clips[name.asSymbol];
		^if(clip.isNil) { this.defaultScdPathFor(name) } {
			clip.path ?? { this.defaultScdPathFor(name) }
		}
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
					name,
					if(clip.isLoaded) { clip.size } { "unloaded" },
					if(clip.isLoaded) { clip.duration.round(0.001) } { "unloaded" });
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
					if(clip.isLoaded.not) {
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
