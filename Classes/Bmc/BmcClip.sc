BmcClip {
	var <entries, <metadata;

	*new { |entries, metadata| ^super.new.init(entries, metadata) }

	init { |argEntries, argMetadata|
		entries = (argEntries ?? { [] }).collect { |entry|
			[entry[0], entry[1].copy]
		};
		metadata = (argMetadata ?? { () }).copy;
		^this
	}

	size { ^entries.size }
	isEmpty { ^entries.isEmpty }
	notEmpty { ^entries.notEmpty }
	at { |index| ^entries[index] }
	frameAt { |index| ^entries[index][1] }
	timeAt { |index| ^entries[index][0] }
	first { ^entries.first }
	last { ^entries.last }
	duration { ^if(entries.isEmpty) { 0.0 } { entries.last[0] } }
	avatar { ^if(entries.isEmpty) { nil } { entries.first[1][2] } }
	source { ^if(entries.isEmpty) { nil } { entries.first[1][3] } }

	asArray { ^entries.collect { |entry| [entry[0], entry[1].copy] } }
	copy { ^this.class.new(this.asArray, metadata) }

	write { |path|
		this.writeArchive(path);
		^path
	}

	// Write every entry in the human-readable OscRecorder .scd format.
	// Unlike OscRecorder, this deliberately keeps the whole clip in one file.
	writeScd { |path|
		var file = File(path.standardizePath, "w");
		if(file.isOpen.not) {
			Error("Could not open % for writing".format(path)).throw;
		};
		protect {
			entries.do { |entry|
				file.putString("\n//:--[" ++ entry[0].asCompileString ++ "]\n");
				file.putString(entry[1].asCompileString);
			};
		} {
			file.close;
		};
		^path
	}

	// Read the human-readable OscRecorder-style format written by writeScd.
	// The file is scanned one line at a time instead of interpreted as one
	// enormous collection. Recorder timestamps are normalized so playback
	// begins at zero even when the source file used absolute clock times.
	*readScd { |path|
		var file = File(path.standardizePath, "r");
		var entries = List.new;
		var line, closeBracket, timestamp, firstTimestamp, awaitingMessage = false;
		var message;
		if(file.isOpen.not) {
			Error("Could not open % for reading".format(path)).throw;
		};
		protect {
			while {
				line = file.getLine(1048576);
				line.notNil
			} {
				if(line.beginsWith("//:--[")) {
					if(awaitingMessage) {
						Error("Missing OSC message after timestamp in %".format(path)).throw;
					};
					closeBracket = line.find("]", 6);
					if(closeBracket.isNil) {
						Error("Malformed timestamp line in %: %".format(path, line)).throw;
					};
					timestamp = line.copyRange(6, closeBracket - 1).interpret;
					if(timestamp.isNumber.not) {
						Error("Non-numeric timestamp in %: %".format(path, line)).throw;
					};
					firstTimestamp = firstTimestamp ?? { timestamp };
					awaitingMessage = true;
				} {
					if(awaitingMessage and: { line.notEmpty }) {
						message = line.interpret;
						Bmc.validateMessage(message, "SCD clip frame");
						entries.add([timestamp - firstTimestamp, message]);
						awaitingMessage = false;
					};
				};
			};
			if(awaitingMessage) {
				Error("Missing OSC message at end of %".format(path)).throw;
			};
		} {
			file.close;
		};
		^BmcMocapClip(entries.asArray, (
			storageFormat: \scd,
			originalStartTime: firstTimestamp,
			sourcePath: path.standardizePath
		))
	}

	*read { |path|
		var clip;
		if(PathName(path).extension.asString.toLower == "scd") {
			^this.readScd(path)
		};
		clip = Object.readArchive(path);
		if(clip.isKindOf(BmcClip).not) {
			Error("% does not contain a BmcClip".format(path)).throw;
		};
		^clip
	}
}
