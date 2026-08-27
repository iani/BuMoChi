BmcSession {
	var <name, <clips, <avatars, <path;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = Platform.userAppSupportDir +/+ "BmcSessions"
		}
	}

	*new { |name, clips, avatars| ^super.new.init(name, clips, avatars) }

	init { |argName, argClips, argAvatars|
		if(argName.isNil) { Error("BmcSession requires a name").throw };
		name = argName.asSymbol;
		clips = this.normalizeClips(argClips ?? { IdentityDictionary.new });
		avatars = this.normalizeAvatars(argAvatars ?? { IdentityDictionary.new });
		^this
	}

	normalizeClips { |source|
		var result = IdentityDictionary.new;
		source.keysValuesDo { |key, settings|
			var item;
			if(settings.isKindOf(Dictionary).not) {
				Error("Session clip % must contain a settings dictionary".format(key)).throw;
			};
			item = settings.copy;
			item[\clip] = (item[\clip] ?? { key }).asSymbol;
			if(item[\avatar].isNil) {
				Error("Session clip % requires an avatar name".format(key)).throw;
			};
			item[\avatar] = item[\avatar].asSymbol;
			item[\rate] = item[\rate] ?? { 1.0 };
			item[\loop] = item[\loop] ?? { false };
			item[\start] = item[\start] ?? { 0.0 };
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
					Error("Session avatar % requires a port or route dictionary".format(key)).throw
				}
			};
			item[\host] = item[\host] ?? { "127.0.0.1" };
			if(item[\port].isNil) {
				Error("Session avatar % requires an OSC destination port".format(key)).throw;
			};
			item[\port] = item[\port].asInteger;
			result[key.asSymbol] = item;
		};
		^result
	}

	clipSettings { |key| ^clips[key.asSymbol] }
	avatarSettings { |key| ^avatars[key.asSymbol] }

	asData {
		^(
			name: name,
			clips: clips,
			avatars: avatars
		)
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
		var data, session;
		argPath = argPath.standardizePath;
		if(File.exists(argPath).not) { Error("Bmc session not found: %".format(argPath)).throw };
		data = File.readAllString(argPath).interpret;
		if(data.isKindOf(Dictionary).not) {
			Error("Bmc session file does not contain a data dictionary: %".format(argPath)).throw;
		};
		session = this.new(
			data[\name] ?? { PathName(argPath).fileNameWithoutExtension },
			data[\clips], data[\avatars]
		);
		session.path_(argPath);
		^session
	}

	path_ { |argPath| path = argPath; ^this }
}
