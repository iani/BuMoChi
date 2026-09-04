BmcClipEditor {
	var <window, clipLibrary, presetLibrary, selectedClipName, selectedPresetName;
	var clipList, presetList, startBox, endBox, loopBox, speedBox, bonesField, targetsField;
	var sonificationView, modificationView, rangeSlider, clipNameField, presetNameField;
	var statusText, inputActiveBox, inputUpdater, inputWasActive;

	*new { |clipLibrary, presetLibrary, initialClip|
		^super.new.init(clipLibrary, presetLibrary, initialClip)
	}

	init { |argClipLibrary, argPresetLibrary, initialClip|
		clipLibrary = argClipLibrary;
		presetLibrary = argPresetLibrary;
		selectedClipName = initialClip !? _.asSymbol;
		this.build;
		^this
	}

	nameArray { |string|
		if(string.asString.stripWhiteSpace.isEmpty) { ^#[] };
		^string.asString.split($,).collect(_.stripWhiteSpace).reject(_.isEmpty).collect(_.asSymbol)
	}

	currentClip {
		if(selectedClipName.isNil) { ^nil };
		^clipLibrary.at(selectedClipName)
	}

	setStatus { |text| statusText.string_(text.asString) }
	handleError { |error|
		this.setStatus(error.asString);
		error.reportError;
		^this
	}

	loadPresetIntoControls { |preset|
		var clip = this.currentClip;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		if(preset.isNil) {
			startBox.value_(0);
			endBox.value_(clip.size - 1);
			loopBox.value_(0);
			speedBox.value_(1.0);
			bonesField.string_("all");
			targetsField.string_(Bmc.avatar.avatarID.asString);
			sonificationView.string_("");
			modificationView.string_("")
		} {
			startBox.value_(preset.startFrame);
			endBox.value_(preset.endFrame);
			loopBox.value_(preset.looping.asInteger);
			speedBox.value_(preset.speed);
			bonesField.string_(if(preset.bones == \all) { "all" } { preset.bones.asArray.join(", ") });
			targetsField.string_(preset.targets.join(", "));
			sonificationView.string_(preset.sonificationCode);
			modificationView.string_(preset.modificationCode)
		};
		this.syncRangeFromBoxes;
		^this
	}

	syncRangeFromBoxes {
		var clip = this.currentClip, start, end;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		start = startBox.value.asInteger.clip(0, clip.size - 1);
		end = endBox.value.asInteger.clip(start, clip.size - 1);
		startBox.value_(start);
		endBox.value_(end);
		rangeSlider.lo_(start / (clip.size - 1).max(1));
		rangeSlider.hi_(end / (clip.size - 1).max(1));
		^this
	}

	syncBoxesFromRange {
		var clip = this.currentClip;
		if(clip.isNil or: { clip.isEmpty }) { ^this };
		startBox.value_((rangeSlider.lo * (clip.size - 1)).round.asInteger);
		endBox.value_((rangeSlider.hi * (clip.size - 1)).round.asInteger);
		^this
	}

	refreshPresets {
		var names;
		if(selectedClipName.isNil) { presetList.items_(#[]); ^this };
		names = presetLibrary.refresh(selectedClipName);
		presetList.items_(names.collect(_.asString));
		selectedPresetName = if(names.includes(selectedPresetName)) { selectedPresetName } { names.first };
		if(selectedPresetName.notNil) {
			presetList.value_(names.indexOfEqual(selectedPresetName));
			presetNameField.string_(selectedPresetName.asString);
			this.loadPresetIntoControls(presetLibrary.at(selectedClipName, selectedPresetName))
		} {
			presetNameField.string_("");
			this.loadPresetIntoControls(nil);
			this.setStatus("No presets found for %. Enter a name and add a new preset."
				.format(selectedClipName))
		};
		^this
	}

	selectClipAt { |index|
		var names = clipLibrary.names, clip;
		if(index.inclusivelyBetween(0, names.size - 1).not) { ^this };
		selectedClipName = names[index];
		clip = clipLibrary.select(selectedClipName);
		startBox.clipHi_(clip.size - 1);
		endBox.clipHi_(clip.size - 1);
		selectedPresetName = nil;
		this.refreshPresets;
		this.setStatus("Selected clip: % (% frames)".format(selectedClipName, clip.size));
		^this
	}

	refreshClips {
		var names;
		clipLibrary.refreshSaved;
		names = clipLibrary.names;
		clipList.items_(names.collect(_.asString));
		selectedClipName = if(names.includes(selectedClipName)) { selectedClipName } {
			clipLibrary.currentName ?? { names.first }
		};
		if(selectedClipName.notNil) {
			clipList.value_(names.indexOfEqual(selectedClipName));
			this.selectClipAt(clipList.value)
		} {
			presetList.items_(#[]);
			this.setStatus("No clips found. Enter a clip name and record a new clip.")
		};
		^this
	}

	presetFromControls {
		var name = presetNameField.string.stripWhiteSpace;
		var bones = this.nameArray(bonesField.string);
		if(selectedClipName.isNil) { Error("Select a clip before creating a preset").throw };
		if(name.isEmpty) { Error("Enter a preset name before creating or saving it").throw };
		if(bones.size == 1 and: { bones.first == \all }) { bones = \all };
		^BmcClipPreset(name, selectedClipName, startBox.value, endBox.value,
			loopBox.value == 1, speedBox.value, bones,
			this.nameArray(targetsField.string), sonificationView.string,
			modificationView.string)
	}

	addPreset {
		var preset = this.presetFromControls;
		presetLibrary.save(preset, this.currentClip, false);
		selectedPresetName = preset.name;
		this.refreshPresets;
		this.setStatus("Saved preset %".format(preset.name));
		^preset
	}

	savePreset {
		var preset = this.presetFromControls;
		if(selectedPresetName.isNil or: { preset.name != selectedPresetName }) {
			Error("Use Add new preset when saving a new preset name").throw
		};
		presetLibrary.save(preset, this.currentClip, true);
		this.setStatus("Saved preset %".format(preset.name));
		^preset
	}

	playPreset {
		var preset = this.presetFromControls;
		Bmc.playPresetObject(preset);
		this.setStatus("Playing % / %".format(selectedClipName, preset.name));
		^this
	}

	startRecording {
		var name = clipNameField.string.stripWhiteSpace;
		if(name.isEmpty) { Error("Enter a new clip name before recording").throw };
		if(clipLibrary.names.includes(name.asSymbol)) {
			Error("Clip name already exists; enter a different name: %".format(name)).throw
		};
		Bmc.record(name.asSymbol);
		this.setStatus("Now recording clip %".format(name));
		^this
	}

	stopRecording {
		var clip, name = clipNameField.string.stripWhiteSpace;
		if(Bmc.isRecording.not) { Error("Bmc is not recording").throw };
		clip = Bmc.stopRecording;
		this.refreshClips;
		this.setStatus("Clip saved. % Start frame 0 end frame % Duration %."
			.format(name, clip.size - 1, clip.duration.round(0.001)));
		^this
	}

	build {
		{
			var addPresetButton, savePresetButton, recordButton, stopRecordButton;
			var playButton, stopButton, parameterLayout;
			window = Window("BuMoChi Clip Editor", Rect(100, 100, 1120, 680));
			clipList = ListView().minWidth_(180);
			presetList = ListView().minWidth_(180);
			startBox = NumberBox().decimals_(0).clipLo_(0);
			endBox = NumberBox().decimals_(0).clipLo_(0);
			loopBox = CheckBox().string_("Loop");
			speedBox = NumberBox().value_(1.0).clipLo_(-100).clipHi_(100);
			bonesField = TextField().string_("all");
			targetsField = TextField();
			sonificationView = TextView().minHeight_(100);
			modificationView = TextView().minHeight_(100);
			rangeSlider = RangeSlider();
			clipNameField = TextField();
			presetNameField = TextField();
			statusText = TextView().editable_(false).minHeight_(28).maxHeight_(28)
				.string_("Ready");
			inputActiveBox = CheckBox().string_("Animation Data input active:").enabled_(false);
			addPresetButton = Button().states_([["Add new preset"]]);
			savePresetButton = Button().states_([["Save preset"]]);
			recordButton = Button().states_([["Record new clip"]]);
			stopRecordButton = Button().states_([["Stop recording"]]);
			playButton = Button().states_([["Start playback"]]);
			stopButton = Button().states_([["Stop playback"]]);

			clipList.action_({ |view| this.selectClipAt(view.value) });
			presetList.action_({ |view|
				var names = presetLibrary.names(selectedClipName);
				if(view.value.inclusivelyBetween(0, names.size - 1)) {
					selectedPresetName = names[view.value];
					presetNameField.string_(selectedPresetName.asString);
					this.loadPresetIntoControls(presetLibrary.at(selectedClipName, selectedPresetName))
				}
			});
			startBox.action_({ this.syncRangeFromBoxes });
			endBox.action_({ this.syncRangeFromBoxes });
			rangeSlider.action_({ this.syncBoxesFromRange });
			addPresetButton.action_({ try { this.addPreset } { |error| this.handleError(error) } });
			savePresetButton.action_({ try { this.savePreset } { |error| this.handleError(error) } });
			recordButton.action_({ try { this.startRecording } { |error| this.handleError(error) } });
			stopRecordButton.action_({ try { this.stopRecording } { |error| this.handleError(error) } });
			playButton.action_({ try { this.playPreset } { |error| this.handleError(error) } });
			stopButton.action_({ Bmc.stopPlayback(\clipEditor); this.setStatus("Playback stopped") });

			parameterLayout = VLayout(
				StaticText().string_("Preset parameters"),
				HLayout(StaticText().string_("Start frame"), startBox,
					StaticText().string_("End frame"), endBox),
				HLayout(loopBox, StaticText().string_("Speed"), speedBox),
				HLayout(StaticText().string_("Bones (comma-separated)"), bonesField),
				HLayout(StaticText().string_("Targets (comma-separated)"), targetsField),
				StaticText().string_("Sonification code (stored, not run on load)"), sonificationView,
				StaticText().string_("Frame-modification code (stored, not run on load)"), modificationView
			);

			window.layout = VLayout(
				HLayout(
					VLayout(StaticText().string_("Clips"), clipList),
					VLayout(StaticText().string_("Presets"), presetList),
					parameterLayout
				),
				HLayout(StaticText().string_("Preset range"), rangeSlider),
				HLayout(recordButton, StaticText().string_("New clip name"), clipNameField,
					stopRecordButton, playButton, stopButton, inputActiveBox),
				HLayout(addPresetButton, StaticText().string_("Preset name"), presetNameField,
					savePresetButton),
				statusText
			);
			inputUpdater = Routine({
				loop {
					var inputActive = Bmc.animationDataInputActive;
					inputActiveBox.value_(inputActive.asInteger);
					if((inputWasActive.isNil or: { inputWasActive }) and: { inputActive.not }) {
						this.setStatus("Animation data input off. Check source and OSCDecoder status.")
					};
					inputWasActive = inputActive;
					0.2.wait
				}
			}).play(AppClock);
			window.onClose_({
				inputUpdater.stop;
				Bmc.playerNames.select { |name|
					name.asString.beginsWith("clipEditor")
				}.do { |name|
					Bmc.stopPlayback(name);
					Bmc.removePlayer(name)
				}
			});
			this.refreshClips;
			window.front;
		}.defer;
		^this
	}
}
