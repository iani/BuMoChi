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

	*read { |path|
		var clip = Object.readArchive(path);
		if(clip.isKindOf(BmcClip).not) {
			Error("% does not contain a BmcClip".format(path)).throw;
		};
		^clip
	}
}
