BmcClipLibrary {
	var <clips, <currentName;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = Platform.userAppSupportDir +/+ "BmcClips"
		}
	}

	*new { ^super.new.init }

	init {
		clips = IdentityDictionary.new;
		^this
	}

	add { |name, clip|
		if(clip.isKindOf(BmcClip).not) {
			Error("BmcClipLibrary can only store BmcClip objects").throw;
		};
		name = name ?? { this.nextName };
		name = name.asSymbol;
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
		if(clip.isNil) { Error("Unknown Bmc clip: %".format(oldName)).throw };
		this.remove(oldName);
		^this.add(newName, clip)
	}

	clear {
		clips.clear;
		currentName = nil;
		^this
	}

	load { |path, name|
		var clip = BmcClip.read(path);
		^this.add(name ?? { PathName(path).fileNameWithoutExtension.asSymbol }, clip)
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
		^clip.write(path)
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
			var view = ListView(window, window.view.bounds.insetBy(10, 10));
			var names = this.names;
			view.items = names.collect { |name|
				var clip = clips[name];
				"% — % frames — % s".format(name, clip.size, clip.duration.round(0.001))
			};
			view.value = names.indexOfEqual(currentName) ?? { 0 };
			view.action = { |list|
				if(names.notEmpty) { this.select(names[list.value]) };
			};
			window.front;
		}.defer;
		^this
	}
}
