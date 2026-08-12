// 水 22 10 2025 21:09
// See description in Settings.md

Settings : NamedInstance {
	var settings;

	settings { ^settings ?? { settings = IdentityDictionary() } }

	// templates for methods to implement :
	addSetting { | key, value |

		this.save;
		Settings.changed(\modified, name);
	}

	removeSetting { | key |

		this.save;
		Settings.changed(\modified, name);
	}

	*save {
		var text, file, path;
		path = (Platform.userAppSupportDir +/+ Date.localtime.stamp ++ ".scd");
		text = (a: 1, b: 2).asCompileString;
		file = File(path, "w");
		if(file.isOpen) {
			protect {
				file.write(text);
			} { file.close };
		} {
			format("Could not open file: %", path).postln;
		}
	}

	load {

	}
}
