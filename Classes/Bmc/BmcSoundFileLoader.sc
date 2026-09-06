BmcSoundFileLoader {
	classvar <audioExtensions;
	var <server, <directory, <library, <routine, <playbackSynths;

	*initClass {
		audioExtensions = #[aif, aiff, flac, mp3, ogg, wav];
	}

	*new { |server, directory, library|
		^super.new.init(server, directory, library)
	}

	init { |argServer, argDirectory, argLibrary|
		server = argServer ?? { Server.default };
		directory = (argDirectory ?? { BmcDataFolder.soundFiles }).standardizePath;
		library = argLibrary ?? { Library.global };
		playbackSynths = List.new;
		^this
	}

	playBuffer { |name|
		var buffer = library.at(\buffers, name.asSymbol);
		var synth;
		if(buffer.isNil) {
			"Bmc: unknown audio buffer %".format(name).warn;
			^nil
		};
		synth = buffer.play;
		playbackSynths.add(synth);
		synth.onFree({ playbackSynths.remove(synth) });
		^synth
	}

	stopPlayback {
		playbackSynths.copy.do(_.free);
		playbackSynths.clear;
		^this
	}

	soundFiles {
		var folder = PathName(directory);
		if(folder.isFolder.not) {
			"Bmc: SoundFiles directory not found: %".format(directory).warn;
			^#[]
		};
		^folder.files.select { |file|
			audioExtensions.includes(file.extension.asString.toLower.asSymbol)
		}.sort { |left, right| left.fullPath < right.fullPath }
	}

	load {
		var files = this.soundFiles;
		routine = Routine({
			var fileKeys = files.collect { |file|
				file.fileNameWithoutExtension.asSymbol
			}.asSet;
			var previousKeys = library.at(\bmcAudioBufferNames) ?? { Set.new };

			// Reconcile buffers managed by Bmc with the files currently on disk.
			previousKeys.difference(fileKeys).do { |key|
				var stale = library.at(\buffers, key);
				if(stale.notNil and: {
					stale.respondsTo(\server) and: { stale.server === server }
				}) {
					stale.free;
				};
				library.removeAt(\buffers, key);
			};

			files.do { |file|
				var key = file.fileNameWithoutExtension.asSymbol;
				var previous = library.at(\buffers, key);
				var buffer;
				if(previous.notNil and: { previous.server === server }) {
					previous.free;
				};
				buffer = Buffer.read(server, file.fullPath);
				server.sync;
				library.put(\buffers, key, buffer);
			};
			library.put(\bmcAudioBufferNames, fileKeys);
			"Bmc: loaded % sound file(s) from %".format(files.size, directory).postln;
		}).play(SystemClock);
		^routine
	}
}
