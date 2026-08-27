BmcSession {
	var <name, <clips, <avatars, <decoder, <path;
	classvar defaultDirectory;

	*defaultDirectory {
		^defaultDirectory ?? {
			defaultDirectory = Platform.userAppSupportDir +/+ "BmcSessions"
		}
	}

	*new { |name, clips, avatars, decoder| ^super.new.init(name, clips, avatars, decoder) }

	init { |argName, argClips, argAvatars, argDecoder|
		if(argName.isNil) { Error("BmcSession requires a name").throw };
		name = argName.asSymbol;
		clips = this.normalizeClips(argClips ?? { IdentityDictionary.new });
		avatars = this.normalizeAvatars(argAvatars ?? { IdentityDictionary.new });
		decoder = this.normalizeDecoder(argDecoder);
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
			if(item[\port].isNil and: { item[\vmcPort].isNil }) {
				Error("Session avatar % requires port or vmcPort".format(key)).throw;
			};
			if(item[\port].notNil) { item[\port] = item[\port].asInteger };
			if(item[\vmcPort].notNil) { item[\vmcPort] = item[\vmcPort].asInteger };
			[item[\port], item[\vmcPort]].reject(_.isNil).do { |port|
				if((port < 1) or: { port > 65535 }) {
					Error("Session avatar % has invalid destination port %"
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
				Error("Session decoder requires a port or route dictionary").throw
			}
		};
		item[\host] = item[\host] ?? { "127.0.0.1" };
		if(item[\port].isNil) { Error("Session decoder requires an input port").throw };
		item[\port] = item[\port].asInteger;
		if((item[\port] < 1) or: { item[\port] > 65535 }) {
			Error("Session decoder has invalid input port %".format(item[\port])).throw;
		};
		^item
	}

	clipSettings { |key| ^clips[key.asSymbol] }
	avatarSettings { |key| ^avatars[key.asSymbol] }

	asData {
		var result = (
			name: name,
			clips: clips,
			avatars: avatars
		);
		if(decoder.notNil) { result[\decoder] = decoder };
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
		var data, session;
		argPath = argPath.standardizePath;
		if(File.exists(argPath).not) { Error("Bmc session not found: %".format(argPath)).throw };
		data = File.readAllString(argPath).interpret;
		if(data.isKindOf(Dictionary).not) {
			Error("Bmc session file does not contain a data dictionary: %".format(argPath)).throw;
		};
		session = this.new(
			data[\name] ?? { PathName(argPath).fileNameWithoutExtension },
			data[\clips], data[\avatars], data[\decoder]
		);
		session.path_(argPath);
		^session
	}

	path_ { |argPath| path = argPath; ^this }
}
