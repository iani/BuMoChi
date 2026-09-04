BmcScene {
	var <name, <motions, <avatars, <decoder, <project, <godotScene, <path;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = Platform.userAppSupportDir +/+ "BmcScenes"
		}
	}

	*new { |name, motions, avatars, decoder, project, godotScene|
		^super.new.init(name, motions, avatars, decoder, project, godotScene)
	}

	init { |argName, argMotions, argAvatars, argDecoder, argProject, argGodotScene|
		if(argName.isNil) { Error("BmcScene requires a name").throw };
		name = argName.asSymbol;
		motions = this.normalizeMotions(argMotions ?? { IdentityDictionary.new });
		avatars = this.normalizeAvatars(argAvatars ?? { IdentityDictionary.new });
		decoder = this.normalizeDecoder(argDecoder);
		project = argProject !? _.asSymbol;
		godotScene = argGodotScene !? _.asString;
		^this
	}

	normalizeMotions { |source|
		var result = IdentityDictionary.new;
		source.keysValuesDo { |key, settings|
			var item;
			if(settings.isKindOf(Dictionary).not) {
				Error("Scene motion % must contain a settings dictionary".format(key)).throw;
			};
			item = settings.copy;
			item[\clip] = (item[\clip] ?? { key }).asSymbol;
			if(item[\avatar].isNil) {
				Error("Scene motion % requires an avatar name".format(key)).throw;
			};
			item[\avatar] = item[\avatar].asSymbol;
			item[\rate] = item[\rate] ?? { 1.0 };
			item[\loop] = item[\loop] ?? { false };
			item[\in] = item[\in] ?? { 0.0 };
			result[key.asSymbol] = item;
		};
		^result
	}

	normalizeAvatars { |source|
		var result = IdentityDictionary.new;
		source.keysValuesDo { |key, route|
			var item = if(route.isNumber) {
				(host: "127.0.0.1", port: route.asInteger)
			} {
				if(route.isKindOf(Dictionary)) { route.copy } {
					Error("Scene avatar % requires a port or route dictionary".format(key)).throw
				}
			};
			item[\host] = item[\host] ?? { "127.0.0.1" };
			if(item[\port].isNil and: { item[\vmcPort].isNil }) {
				Error("Scene avatar % requires port or vmcPort".format(key)).throw;
			};
			if(item[\port].notNil) { item[\port] = item[\port].asInteger };
			if(item[\vmcPort].notNil) { item[\vmcPort] = item[\vmcPort].asInteger };
			[item[\port], item[\vmcPort]].reject(_.isNil).do { |port|
				if((port < 1) or: { port > 65535 }) {
					Error("Scene avatar % has invalid destination port %"
						.format(key, port)).throw;
				};
			};
			result[key.asSymbol] = item;
		};
		^result
	}

	normalizeDecoder { |route|
		var item;
		if(route.isNil) { ^nil };
		item = if(route.isNumber) {
			(host: "127.0.0.1", port: route.asInteger)
		} {
			if(route.isKindOf(Dictionary)) { route.copy } {
				Error("Scene decoder requires a port or route dictionary").throw
			}
		};
		item[\host] = item[\host] ?? { "127.0.0.1" };
		if(item[\port].isNil) { Error("Scene decoder requires an input port").throw };
		item[\port] = item[\port].asInteger;
		if((item[\port] < 1) or: { item[\port] > 65535 }) {
			Error("Scene decoder has invalid input port %".format(item[\port])).throw;
		};
		^item
	}

	motionSettings { |key| ^motions[key.asSymbol] }
	avatarSettings { |key| ^avatars[key.asSymbol] }

	asData {
		var result = (
			format: \bmcScene,
			formatVersion: 1,
			name: name,
			motions: motions,
			avatars: avatars
		);
		if(decoder.notNil) { result[\decoder] = decoder };
		if(project.notNil) { result[\project] = project };
		if(godotScene.notNil) { result[\godotScene] = godotScene };
		^result
	}

	defaultPath {
		if(File.exists(this.class.defaultDirectory).not) {
			File.mkdir(this.class.defaultDirectory);
		};
		^this.class.defaultDirectory +/+ (name.asString ++ ".scd")
	}

	write { |argPath|
		var file;
		path = (argPath ?? { this.defaultPath }).standardizePath;
		file = File(path, "w");
		if(file.isOpen.not) { Error("Could not open % for writing".format(path)).throw };
		protect {
			file.putString(this.asData.asCompileString);
			file.putString("\n");
		} {
			file.close;
		};
		^path
	}

	*read { |argPath|
		var data, scene;
		argPath = argPath.standardizePath;
		if(File.exists(argPath).not) { Error("Bmc Scene not found: %".format(argPath)).throw };
		data = File.readAllString(argPath).interpret;
		if(data.isKindOf(Dictionary).not) {
			Error("Bmc Scene file does not contain a data dictionary: %".format(argPath)).throw;
		};
		if(data[\format] != \bmcScene or: { data[\formatVersion] != 1 }) {
			Error("Bmc Scene file has unsupported format: %".format(argPath)).throw
		};
		scene = this.new(
			data[\name] ?? { PathName(argPath).fileNameWithoutExtension },
			data[\motions], data[\avatars], data[\decoder],
			data[\project], data[\godotScene]
		);
		scene.path_(argPath);
		^scene
	}

	path_ { |argPath| path = argPath; ^this }
}
