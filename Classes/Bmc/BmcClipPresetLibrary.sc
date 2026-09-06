BmcClipPresetLibrary {
	var <presets;

	*new { ^super.new.init }

	init { presets = IdentityDictionary.new; ^this }

	directoryFor { |clipName|
		^BmcDataFolder.animationClips +/+ clipName.asString +/+ "Presets"
	}

	ensureDirectoryFor { |clipName|
		var clipDirectory = BmcDataFolder.animationClips +/+ clipName.asString;
		BmcDataFolder.ensureDirectory(clipDirectory);
		^BmcDataFolder.ensureDirectory(clipDirectory +/+ "Presets")
	}

	pathFor { |clipName, presetName|
		^this.directoryFor(clipName) +/+ (presetName.asString ++ ".scd")
	}

	refresh { |clipName|
		var result = IdentityDictionary.new;
		var directory = PathName(this.directoryFor(clipName));
		if(directory.isFolder) {
			directory.files.do { |file|
				if(file.extension.asString.toLower == "scd") {
					var data = File.readAllString(file.fullPath).interpret;
					var preset = BmcClipPreset.fromData(data);
					if(preset.sourceClip == clipName.asSymbol) { result[preset.name] = preset }
				}
			}
		};
		presets[clipName.asSymbol] = result;
		^result.keys.asArray.sort
	}

	names { |clipName|
		var collection = presets[clipName.asSymbol];
		if(collection.isNil) { ^this.refresh(clipName) };
		^collection.keys.asArray.sort
	}

	at { |clipName, presetName|
		if(presets[clipName.asSymbol].isNil) { this.refresh(clipName) };
		^presets[clipName.asSymbol][presetName.asSymbol]
	}

	save { |preset, clip, overwrite = false|
		var path;
		preset.validateFor(clip);
		path = this.pathFor(preset.sourceClip, preset.name);
		if(File.exists(path) and: { overwrite.not }) {
			Error("Bmc clip preset already exists: %".format(preset.name)).throw
		};
		this.ensureDirectoryFor(preset.sourceClip);
		File.use(path, "w", { |file|
			file.putString(preset.asData(clip).asCompileString);
			file.putString("\n")
		});
		presets[preset.sourceClip] = presets[preset.sourceClip] ?? { IdentityDictionary.new };
		presets[preset.sourceClip][preset.name] = preset;
		^preset
	}
}
