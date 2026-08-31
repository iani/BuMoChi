BmcClip {
	var <name, <path, <frames, <metadata;

	*new { |frames, metadata, name, path| ^super.new.init(frames, metadata, name, path) }

	init { |argFrames, argMetadata, argName, argPath|
		frames = if(argFrames.isNil) { nil } {
			argFrames.collect { |entry| [entry[0], entry[1].copy] }
		};
		metadata = (argMetadata ?? { () }).copy;
		name = argName !? _.asSymbol;
		path = argPath !? _.standardizePath;
		^this
	}

	name_ { |value| name = value !? _.asSymbol; ^name }
	path_ { |value| path = value !? _.standardizePath; ^path }
	frames_ { |value|
		frames = if(value.isNil) { nil } {
			value.collect { |entry| [entry[0], entry[1].copy] }
		};
		^frames
	}
	isLoaded { ^frames.notNil }

	size { ^frames.notNil.if({ frames.size }, { 0 }) }
	isEmpty { ^frames.isNil or: { frames.isEmpty } }
	notEmpty { ^frames.notNil and: { frames.notEmpty } }
	at { |index| ^frames[index] }
	frameAt { |index| ^frames[index][1] }
	timeAt { |index| ^frames[index][0] }
	first { ^frames !? _.first }
	last { ^frames !? _.last }
	duration { ^if(frames.isNil or: { frames.isEmpty }) { 0.0 } { frames.last[0] } }
	avatar { ^if(frames.isNil or: { frames.isEmpty }) { nil } { frames.first[1][2] } }
	source { ^if(frames.isNil or: { frames.isEmpty }) { nil } { frames.first[1][3] } }

	asArray { ^if(frames.isNil) { nil } { frames.collect { |entry| [entry[0], entry[1].copy] } } }
	copy { ^this.class.new(this.asArray, metadata, name, path) }

	write { |path|
		if(frames.isNil) { Error("Cannot write unloaded BmcClip %".format(name)).throw };
		this.writeArchive(path);
		^path
	}

	// Write every entry in the human-readable OscRecorder .scd format.
	// Unlike OscRecorder, this deliberately keeps the whole clip in one file.
	writeScd { |path|
		var file = File(path.standardizePath, "w");
		if(frames.isNil) { Error("Cannot write unloaded BmcClip %".format(name)).throw };
		if(file.isOpen.not) {
			Error("Could not open % for writing".format(path)).throw;
		};
		protect {
			frames.do { |entry|
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
		), PathName(path).fileNameWithoutExtension.asSymbol, path)
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
		clip.path_(path);
		clip.name_(clip.name ?? { PathName(path).fileNameWithoutExtension.asSymbol });
		^clip
	}
}
