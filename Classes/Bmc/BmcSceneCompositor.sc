// Repertoire-based improvisation prototype. Generates ordinary BmcClip data;
// originals are never edited. Body rotations use shortest-path normalized
// quaternion interpolation; auxiliary VMC channels follow the nearest frame.
BmcSceneCompositor {
	var <window, <generatedClip, clipNames, targetNames;
	var clipList, targetMenu, portBox, durationBox, phraseBox, blendBox, variationBox, seedBox;
	var statusText, planText, saveName, generateButton, playButton, saveButton;
	var generationTask, statusTask, generating = false, wasPlaying = false;
	var playerName, temporaryName;
	var sceneList, sceneEntries, selectedScene, sceneReport, sceneRevision = 0;
	var playbackPending = false, playbackSerial = 0, startupTask;
	var playClipButton, playbackClip, playbackLabel;

	*new { ^super.new.init }
	init {
		playerName = ("sceneCompositor_" ++ this.identityHash).asSymbol;
		temporaryName = ("sceneCompositorDraft_" ++ this.identityHash).asSymbol;
		this.build;
		^this
	}

	*blendFrames { |left, right, amount|
		var pose = BmcPose.new;
		amount = amount.clip(0, 1);
		Bmc.boneNames.do { |bone|
			var a = left.pose.at(bone), b = right.pose.at(bone);
			var qa = a.rotation, qb = b.rotation, rotation, length;
			var position = a.position.blend(b.position, amount);
			// q and -q encode the same orientation; choose the short arc.
			if((qa * qb).sum < 0) { qb = qb.neg };
			rotation = qa.blend(qb, amount);
			length = rotation.squared.sum.sqrt;
			rotation = if(length < 0.000001) { [0, 0, 0, 1] } { rotation / length };
			pose.put(bone, position ++ rotation)
		};
		^if(amount < 0.5) { left } { right }.withoutRoute.withPose(pose)
	}

	*sample { |clip, time|
		var low = 0, high = clip.size - 1, middle, next, span;
		time = time.clip(clip.timeAt(0), clip.duration);
		while { low < high } {
			middle = ((low + high + 1) / 2).floor.asInteger;
			if(clip.timeAt(middle) <= time) { low = middle } { high = middle - 1 }
		};
		next = (low + 1).min(clip.size - 1);
		span = clip.timeAt(next) - clip.timeAt(low);
		^this.blendFrames(BmcFrame.fromOSC(clip.frameAt(low)),
			BmcFrame.fromOSC(clip.frameAt(next)),
			if(span <= 0) { 0 } { (time - clip.timeAt(low)) / span })
	}

	*poseDistance { |left, right|
		// Prefer compatible body orientations and nearby root positions.
		var score = 0.0;
		Bmc.boneNames.do { |bone|
			var a = left.pose.at(bone).rotation, b = right.pose.at(bone).rotation;
			var denominator = (a.squared.sum * b.squared.sum).sqrt.max(0.000001);
			score = score + (1 - ((a * b).sum.abs / denominator).clip(0, 1))
		};
		^score + (left.pose.at(\Hips).position - right.pose.at(\Hips).position).squared.sum
	}

	*generate { |clips, duration = 30, phraseDuration = 4, transition = 0.6,
		variation = 0.25, seed = 1, fps = 30, progress|
		var frames = List.new, phrases = List.new, previousClip;
		var required, result;
		if(clips.isNil or: { clips.isEmpty }) { Error("Select at least one animation clip").throw };
		if(duration <= 0 or: { duration > 120 }) { Error("Performance length must be 1–120 seconds").throw };
		if(phraseDuration < 0.5 or: { phraseDuration > 20 }) { Error("Phrase length must be 0.5–20 seconds").throw };
		if(fps < 1 or: { fps > 60 }) { Error("Frame rate must be 1–60").throw };
		if(transition < 0 or: { transition >= phraseDuration }) {
			Error("Transition length must be shorter than the phrase length").throw
		};
		clips.do { |clip|
			if(clip.isNil or: { clip.size < 2 } or: { clip.duration <= clip.timeAt(0) }) {
				Error("Each selected clip needs at least two timed frames").throw
			};
			clip.frames.doAdjacentPairs { |a, b|
				if(b[0] < a[0]) { Error("Clip timestamps must be in ascending order").throw }
			}
		};
		variation = variation.clip(0, 0.75);
		thisThread.randSeed_(seed.asInteger);
		required = (duration * fps).ceil.asInteger + 1;
		while { frames.size < required } {
			var pool = clips.reject { |clip| clip === previousClip };
			var choices, chosen, clip, speed, start, seconds, count, overlap, offset;
			if(pool.isEmpty) { pool = clips };
			choices = Array.fill(8, {
				var source = pool.choose, rate = rrand(1 - variation, 1 + variation);
				var length = phraseDuration.min((source.duration - source.timeAt(0)) / rate);
				var from = rrand(source.timeAt(0), (source.duration - (length * rate)).max(source.timeAt(0)));
				var first = this.sample(source, from);
				var distance = if(frames.isEmpty) { 0 } { this.poseDistance(frames.last, first) };
				(clip: source, speed: rate, start: from, duration: length,
					score: distance + rrand(0.0, variation * 2))
			});
			chosen = choices.sort { |a, b| a[\score] < b[\score] }.first;
			clip = chosen[\clip]; speed = chosen[\speed]; start = chosen[\start];
			seconds = chosen[\duration];
			count = ((seconds * fps).floor.asInteger + 1).max(2);
			overlap = (transition * fps).round.asInteger.min(count.div(2))
				.min((frames.size - 1).max(0));
			offset = frames.size - overlap;
			count = count.min(required - offset);
			count.do { |index|
				var frame = this.sample(clip, start + (index / fps * speed));
				if(index < overlap) {
					var amount = if(overlap <= 1) { 1 } { index / (overlap - 1) };
					amount = amount.squared * (3 - (2 * amount));
					frames[offset + index] = this.blendFrames(frames[offset + index], frame, amount)
				} {
					frames.add(frame)
				}
			};
			phrases.add((clip: clip.name, at: offset / fps, from: start, speed: speed,
				duration: (count - 1) / fps, overlap: overlap / fps));
			previousClip = clip;
			progress.value(frames.size / required)
		};
		result = frames.collect { |frame, index|
			var time = (index / fps).min(duration);
			[time, BmcFrame(frame.avatar, "scene-compositor", index, time,
				frame.pose, extension: frame.extension.copy).asOSCMessage]
		};
		^BmcClip(result.asArray, (generator: \sceneCompositor, seed: seed,
			phrases: phrases.asArray, fps: fps), \improvisation)
	}

	setStatus { |text| statusText.string_(text) }
	handleError { |error|
		playbackPending = false; this.updateButtons;
		this.setStatus(error.tryPerform(\errorString) ?? { error.asString });
		error.reportError
	}
	selectedPreviewClipName {
		var selection = clipList.selection ?? { #[] }, index;
		if(selection.isEmpty) { ^nil };
		index = if(selection.includes(clipList.value)) { clipList.value } { selection.first };
		^clipNames[index]
	}
	updateButtons {
		generateButton.enabled_(generating.not);
		// Keep playback actions discoverable. Their handlers explain missing
		// inputs and guard pending startup rather than silently disabling them.
		playClipButton.enabled_(true);
		playButton.enabled_(true);
		saveButton.enabled_(generating.not and: { generatedClip.notNil })
	}
	refreshClips {
		var selected = (clipList.selection ?? { #[] }).collect { |index| clipNames[index] };
		Bmc.refreshSavedClips;
		clipNames = Bmc.savedClips;
		clipList.items_(clipNames.collect(_.asString));
		clipList.selection_(clipNames.collect { |name, index| if(selected.includes(name)) { index } { nil } }.reject(_.isNil));
		this.updateButtons;
		^this
	}
	refreshClipDisplays {
		var editor = Bmc.assetEditorWindow;
		this.refreshClips;
		if(editor.notNil and: { editor.window.notNil } and: { editor.window.isClosed.not }) {
			editor.refreshClips
		};
		^this
	}
	refresh {
		this.refreshClips;
		this.refreshScenes
	}
	refreshScenes {
		var previous = selectedScene, index;
		sceneEntries = Bmc.projects.collect { |project|
			Bmc.projectScenes(project).collect { |path| [project, path] }
		}.flatten(1);
		sceneList.items_(sceneEntries.collect { |entry| "% — %".format(entry[0], entry[1]) });
		index = sceneEntries.detectIndex { |entry| entry == previous };
		if(sceneEntries.notEmpty) {
			sceneList.value_(index ?? { 0 });
			this.selectScene(sceneList.value)
		} {
			this.selectScene(-1);
			this.setStatus("No Godot scenes found in the asset folder.")
		}
	}
	selectScene { |index|
		var revision;
		sceneRevision = sceneRevision + 1; revision = sceneRevision;
		playbackSerial = playbackSerial + 1; playbackPending = false;
		if(startupTask.notNil) { startupTask.stop; startupTask = nil };
		if(Bmc.playerNames.includes(playerName)) { Bmc.stopPlayback(playerName) };
		wasPlaying = false;
		sceneReport = nil; targetNames = #[];
		targetMenu.items_(#[]); portBox.enabled_(false);
		selectedScene = if(index.inclusivelyBetween(0, sceneEntries.size - 1)) { sceneEntries[index] } { nil };
		this.updateButtons;
		if(selectedScene.isNil) { ^this };
		if(Bmc.godotServiceReady.not) {
			this.setStatus("Scene selected. Play will start the BMC pipeline and open Godot automatically.");
			^this
		};
		this.inspectSelectedScene;
		^this
	}
	inspectSelectedScene { |action|
		var revision;
		sceneRevision = sceneRevision + 1; revision = sceneRevision;
		this.setStatus("Inspecting %...".format(selectedScene[0]));
		Bmc.inspectProjectData(selectedScene[0], { |data, error|
			{
				if(revision == sceneRevision) {
					if(error.notNil) { this.playbackFailed("Scene inspection failed: " ++ error) } {
						sceneReport = (data[\scenes] ?? { #[] }).detect { |scene| scene[\path] == selectedScene[1] };
						if(sceneReport.isNil or: { sceneReport[\loadable] != true }) {
							sceneReport = nil;
							this.playbackFailed("The selected Scene is not loadable.")
						} {
							targetNames = (sceneReport[\avatarCandidates] ?? { #[] }).collect { |avatar| avatar[\name].asSymbol };
							targetMenu.items_(targetNames.collect(_.asString));
							this.selectTarget;
							if(targetNames.isEmpty) { this.playbackFailed("No avatar targets found in this Scene.") } {
								this.setStatus("Scene selected. Generate a performance, then Play to open it and animate the target.");
								action.value
							}
						}
					};
					this.updateButtons
				}
			}.defer
		});
		^this
	}
	selectTarget {
		var avatars = if(sceneReport.isNil) { #[] } { sceneReport[\avatarCandidates] ?? { #[] } };
		var index = targetMenu.value;
		if(index.inclusivelyBetween(0, avatars.size - 1)) {
			portBox.value_(avatars[index][\vmcPort] ?? { Bmc.defaultAvatarVmcPort });
			portBox.enabled_(true)
		}
	}
	generatePerformance {
		var selection = clipList.selection ?? { #[] };
		var names = selection.collect { |index| clipNames[index] };
		var duration = durationBox.value, phrase = phraseBox.value, blend = blendBox.value;
		var variation = variationBox.value, seed = seedBox.value.asInteger;
		if(names.isEmpty) { Error("Select one or more clips from the repertoire").throw };
		this.stop;
		generating = true; this.updateButtons;
		generationTask = Routine({
			try {
				var clips = names.collect { |name| Bmc.clip(name) };
				generatedClip = this.class.generate(clips, duration, phrase, blend, variation, seed, 30, { |fraction|
					this.setStatus("Generating: % %".format((fraction * 100).round, "%"));
					0.001.wait
				});
				planText.string_(generatedClip.metadata[\phrases].collect { |entry|
					"%s  %  excerpt %s, speed %x".format(entry[\at].round(0.01),
						entry[\clip], entry[\from].round(0.01), entry[\speed].round(0.01))
				}.join("\n"));
				this.setStatus("Ready: % seconds, % phrases. Play to preview; Save clip to keep it."
					.format(generatedClip.duration.round(0.01), generatedClip.metadata[\phrases].size))
			} { |error| this.handleError(error) };
			generating = false; this.updateButtons
		}).play(AppClock)
	}
	playSelectedClip {
		var name = this.selectedPreviewClipName;
		if(playbackPending) { this.setStatus("Preparing playback. Press Stop to cancel."); ^this };
		if(generating) { this.setStatus("Generation is in progress. Wait for it to finish, or press Stop before previewing a clip."); ^this };
		if(name.isNil) { Error("Select an animation clip on the left first").throw };
		^this.startPlayback(Bmc.clip(name), name.asString)
	}
	play {
		if(playbackPending) { this.setStatus("Preparing playback. Press Stop to cancel."); ^this };
		if(generating) { this.setStatus("Generation is in progress. Playback will be available when it finishes."); ^this };
		if(generatedClip.isNil) { Error("Generate a performance first").throw };
		^this.startPlayback(generatedClip, "generated performance")
	}
	startPlayback { |clip, label|
		var serial;
		if(clip.isNil or: { clip.isEmpty }) { Error("The selected clip is empty or unavailable").throw };
		if(selectedScene.isNil) { Error("Select a Scene first").throw };
		if(playbackPending) { ^this };
		// Capture the requested source before asynchronous pipeline/scene startup.
		playbackClip = clip.copy; playbackLabel = label;
		playbackSerial = playbackSerial + 1; serial = playbackSerial;
		playbackPending = true; this.updateButtons;
		startupTask = Routine({
			var waited = 0, ready;
			try {
				this.setStatus("Checking BMC pipeline...");
				Bmc.pipelineReady({ |value| ready = value });
				while { ready.isNil } { 0.05.wait };
				if(ready.not) {
					this.setStatus("Starting BMC pipeline...");
					Bmc.startPipeline;
					// Let the launcher's child-process checks report early failures.
					2.wait;
					while { ready.not and: { Bmc.pipelineRunning } and: { waited < 20 } } {
						ready = nil;
						Bmc.pipelineReady({ |value| ready = value });
						while { ready.isNil } { 0.05.wait };
						0.25.wait; waited = waited + 0.25
					};
				};
				if(serial == playbackSerial) {
					if(ready.not or: { Bmc.godotServiceReady.not }) {
						this.playbackFailed(Bmc.pipelineError ?? { "The pipeline did not become ready. See the post window for details." })
					} {
						if(sceneReport.isNil) {
							this.inspectSelectedScene({
								if(serial == playbackSerial) { this.beginScenePlayback(serial) }
							})
						} {
							this.beginScenePlayback(serial)
						}
					}
				}
			} { |error|
				if(serial == playbackSerial) { this.handleError(error) }
			}
		}).play(AppClock);
		^this
	}
	beginScenePlayback { |serial|
		var name, port;
		if(targetNames.isEmpty) { this.playbackFailed("No avatar targets found in this Scene."); ^this };
		name = targetNames[targetMenu.value]; port = portBox.value.asInteger;
		this.setStatus("Opening selected Scene; waiting for its VMC listener...");
		this.awaitScene(selectedScene, name, port, serial, 0)
	}
	awaitScene { |selection, name, port, serial, attempt|
		Bmc.godotSceneStatus(selection[0], selection[1], [port], { |data, error|
			{
				if(serial == playbackSerial) {
					if(error.notNil) {
						this.playbackFailed(error)
					} {
						if(data[\running] == true and: { data[\listening] == true }) {
							try { this.playOnTarget(name, port) } { |failure| this.playbackFailed(failure.errorString) }
						} {
							if(attempt == 0 and: { data[\running] != true }) {
								Bmc.playGodotScene(selection[0], selection[1], [port], { |report, failure|
									{
										if(serial == playbackSerial) {
											if(failure.notNil) { this.playbackFailed(failure) } {
												this.awaitScene(selection, name, port, serial, 1)
											}
										}
									}.defer
								})
							} {
								if(attempt >= 30) { this.playbackFailed("Scene did not open its VMC listener.") } {
									AppClock.sched(0.5, {
										if(serial == playbackSerial) { this.awaitScene(selection, name, port, serial, attempt + 1) };
										nil
									})
								}
							}
						}
					}
				}
			}.defer
		});
	}
	playbackFailed { |message|
		playbackPending = false; this.updateButtons;
		this.setStatus("Could not play: " ++ message)
	}
	playOnTarget { |name, port|
		var avatar = Bmc.avatar(name) ?? { Bmc.addAvatar(name) };
		avatar.vmcPort_(port);
		Bmc.library.add(temporaryName, playbackClip.copy);
		Bmc.start(Bmc.dispatcher.port);
		Bmc.play(temporaryName, playerName: playerName, avatarName: name);
		playbackPending = false; this.updateButtons;
		wasPlaying = true;
		this.setStatus("Playing % in % / % on % (VMC port %)."
			.format(playbackLabel, selectedScene[0], selectedScene[1], name, port))
	}
	stop {
		if(startupTask.notNil) { startupTask.stop; startupTask = nil };
		playbackSerial = playbackSerial + 1; playbackPending = false;
		if(generationTask.notNil) { generationTask.stop; generationTask = nil };
		generating = false;
		if(Bmc.playerNames.includes(playerName)) { Bmc.stopPlayback(playerName) };
		wasPlaying = false;
		this.updateButtons;
		this.setStatus("Stopped. Live output is available again.")
	}
	save {
		var name = BmcClipPreset.validName(saveName.string), path;
		if(generatedClip.isNil) { Error("Generate a performance first").throw };
		path = Bmc.clipDirectory +/+ (name.asString ++ ".scd");
		if(Bmc.library.names.includes(name) or: { File.exists(path) }
			or: { File.exists(Bmc.clipDirectory +/+ (name.asString ++ ".bmc")) }) {
			this.refreshClipDisplays;
			Error("That clip name already exists. The animation clips lists have been refreshed. Choose a new name to save another clip.").throw
		};
		generatedClip.writeScd(path);
		Bmc.library.add(name, generatedClip.copy, path);
		this.refreshClipDisplays;
		this.setStatus("Saved animation clip: %".format(name))
	}
	cleanup {
		if(startupTask.notNil) { startupTask.stop };
		sceneRevision = sceneRevision + 1; playbackSerial = playbackSerial + 1;
		if(generationTask.notNil) { generationTask.stop };
		if(statusTask.notNil) { statusTask.stop };
		if(Bmc.playerNames.includes(playerName)) { Bmc.removePlayer(playerName) };
		if(Bmc.library.names.includes(temporaryName)) { Bmc.library.remove(temporaryName) }
	}
	close { this.cleanup; if(window.notNil) { window.close }; ^this }
	build {
		{
			var refreshButton = Button().states_([["Refresh clips / scenes"]]);
			var newSeedButton = Button().states_([["New variation"]]);
			var stopButton = Button().states_([["Stop"]]);
			window = Window("SceneCompositor", Rect(150, 100, 920, 650));
			clipNames = #[];
			clipList = ListView().selectionMode_(\multi).minWidth_(300);
			clipList.action_({ this.updateButtons });
			playClipButton = Button().states_([["Play clip"]]);
			playClipButton.action_({ try { this.playSelectedClip } { |error| this.handleError(error) } });
			sceneList = ListView().minHeight_(150);
			sceneList.action_({ |view| try { this.selectScene(view.value) } { |error| this.handleError(error) } });
			targetMenu = PopUpMenu();
			portBox = NumberBox().decimals_(0).clipLo_(1).clipHi_(65535);
			durationBox = NumberBox().value_(30).clipLo_(1).clipHi_(120);
			phraseBox = NumberBox().value_(4).clipLo_(0.5).clipHi_(20);
			blendBox = NumberBox().value_(0.6).clipLo_(0).clipHi_(5);
			variationBox = NumberBox().value_(0.25).clipLo_(0).clipHi_(0.75);
			seedBox = NumberBox().decimals_(0).value_(1).clipLo_(1).clipHi_(1000000);
			statusText = TextView().editable_(false).minHeight_(55).maxHeight_(70);
			planText = TextView().editable_(false);
			saveName = TextField().string_("Improvisation_" ++ Date.localtime.stamp);
			generateButton = Button().states_([["Generate performance"]]);
			playButton = Button().states_([["Play performance"]]);
			saveButton = Button().states_([["Save clip"]]);
			refreshButton.action_({ try { this.refresh } { |error| this.handleError(error) } });
			targetMenu.action_({ this.selectTarget });
			newSeedButton.action_({ seedBox.value_(rrand(1, 1000000)) });
			generateButton.action_({ try { this.generatePerformance } { |error| this.handleError(error) } });
			playButton.action_({ try { this.play } { |error| this.handleError(error) } });
			stopButton.action_({ this.stop });
			saveButton.action_({ try { this.save } { |error| this.handleError(error) } });
			window.layout = VLayout(
				StaticText().string_("SceneCompositor — gesture repertoire prototype"),
				StaticText().string_("Select multiple clips with Command-click or Shift-click. Originals stay unchanged."),
				HLayout(
					VLayout(playClipButton, StaticText().string_("Animation clips"), clipList,
						StaticText().string_("Scene"), sceneList, refreshButton),
					VLayout(
						HLayout(StaticText().string_("Target"), targetMenu, StaticText().string_("VMC port"), portBox),
						HLayout(StaticText().string_("Performance seconds"), durationBox, StaticText().string_("Phrase seconds"), phraseBox),
						HLayout(StaticText().string_("Blend seconds"), blendBox, StaticText().string_("Variation (0–0.75)"), variationBox),
						HLayout(StaticText().string_("Seed"), seedBox, newSeedButton),
						StaticText().string_("Same seed + settings repeat the result. New variation changes the seed."),
						HLayout(generateButton, playButton, stopButton),
						StaticText().string_("Performance phrases"), planText,
						HLayout(saveName, saveButton)
					)
				), statusText
			);
			window.onClose_({ this.cleanup });
			this.refresh; this.updateButtons;
			statusTask = Routine({
				loop {
					if(wasPlaying and: { Bmc.player(playerName).isPlaying.not }) {
						wasPlaying = false;
						this.setStatus("Playback finished. Live output on the destination port has resumed.")
					};
					0.25.wait
				}
			}).play(AppClock);
			window.front
		}.defer;
		^this
	}
}
