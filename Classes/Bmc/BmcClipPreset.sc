BmcClipPreset {
	var <name, <sourceClip, <startFrame, <endFrame, <looping, <speed;
	var <bones, <targets, <sonificationCode, <modificationCode;

	*new { |name, sourceClip, startFrame = 0, endFrame, loop = false, speed = 1.0,
		bones = \all, targets = #[], sonificationCode = "", modificationCode = ""|
		^super.new.init(name, sourceClip, startFrame, endFrame, loop, speed,
			bones, targets, sonificationCode, modificationCode)
	}

	init { |argName, argSourceClip, argStartFrame, argEndFrame, argLoop, argSpeed,
		argBones, argTargets, argSonificationCode, argModificationCode|
		name = this.class.validName(argName);
		sourceClip = this.class.validName(argSourceClip);
		startFrame = argStartFrame.asInteger.max(0);
		endFrame = (argEndFrame ?? { startFrame }).asInteger.max(startFrame);
		looping = argLoop.asBoolean;
		speed = argSpeed.asFloat.clip(-100.0, 100.0);
		bones = argBones ?? { \all };
		targets = (argTargets ?? { #[] }).asArray.collect(_.asSymbol);
		sonificationCode = argSonificationCode.asString;
		modificationCode = argModificationCode.asString;
		^this
	}

	*validName { |value|
		var string;
		if(value.isNil) { Error("Bmc clip preset name cannot be nil").throw };
		string = value.asString.stripWhiteSpace;
		if(string.isEmpty) { Error("Bmc clip preset name cannot be empty").throw };
		if(string.every { |char| char.isAlphaNum or: { "_-".includes(char) } }.not) {
			Error("Bmc clip preset name may contain only letters, numbers, _ and -: %"
				.format(string)).throw
		};
		^string.asSymbol
	}

	validateFor { |clip|
		if(clip.isNil or: { clip.isEmpty }) {
			Error("Preset % requires a loaded source clip".format(name)).throw
		};
		if(startFrame >= clip.size) {
			Error("Preset % start frame is outside clip %".format(name, sourceClip)).throw
		};
		if(endFrame >= clip.size) {
			Error("Preset % end frame is outside clip %".format(name, sourceClip)).throw
		};
		^this
	}

	asData { |clip|
		this.validateFor(clip);
		^(
			format: \bmcClipPreset, formatVersion: 1,
			name: name, sourceClip: sourceClip,
			startFrame: startFrame, endFrame: endFrame,
			startTime: clip.timeAt(startFrame), endTime: clip.timeAt(endFrame),
			sourceFrameCount: clip.size, sourceDuration: clip.duration,
			loop: looping, speed: speed, bones: bones, targets: targets,
			sonificationCode: sonificationCode,
			modificationCode: modificationCode
		)
	}

	*fromData { |data|
		if(data.isKindOf(Dictionary).not or: { data[\format] != \bmcClipPreset }) {
			Error("Invalid Bmc clip preset data").throw
		};
		^this.new(data[\name], data[\sourceClip], data[\startFrame], data[\endFrame],
			data[\loop], data[\speed], data[\bones], data[\targets],
			data[\sonificationCode], data[\modificationCode])
	}
}
