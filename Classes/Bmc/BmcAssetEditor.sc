BmcAssetEditor {
	var <window, <projectView, <selectedProject, <selectedScene;
	var projectList, sceneList, avatarList, details, statusText, inspection;
	var avatarNameField, confirmAvatarButton, avatarMappings;
	var playSceneButton, runningBox, listeningBox, statusUpdater, statusPending = false;
	var clipPresetView, clipList, presetList, bodyPartsList;
	var selectAllBodiesButton, unselectAllBodiesButton;
	var addPresetButton, playPresetButton, stopPresetButton;
	var selectedClipName, selectedPresetName, scenePresetAssignments;
	var animateCameraButton, recordClipButton;
	var newClipNameField, frameCountBox, cameraDataBox, statusTick = 0, activeRecordingName;

	*new { ^super.new.init }

	init {
		avatarMappings = IdentityDictionary.new;
		scenePresetAssignments = IdentityDictionary.new;
		this.build;
		^this
	}

	setStatus { |text| statusText.string_(text.asString) }

	showError { |error|
		// Exception.asString only says "an Error". errorString contains the
		// explanatory message supplied when the Error was created.
		this.setStatus(error.tryPerform(\errorString) ?? { error.asString });
		error.reportError;
		^this
	}

	currentSceneReport {
		var scenes;
		if(inspection.isNil or: { selectedScene.isNil }) { ^nil };
		scenes = inspection[\scenes] ?? { #[] };
		^scenes.detect { |scene| scene[\path] == selectedScene }
	}

	currentAvatars {
		var scene = this.currentSceneReport;
		if(scene.isNil) { ^#[] };
		^scene[\avatarCandidates] ?? { #[] }
	}

	avatarKey { |avatar|
		^"%|%|%".format(selectedProject, selectedScene, avatar[\nodePath]).asSymbol
	}

	targetNameFor { |avatar|
		^avatarMappings[this.avatarKey(avatar)] ?? { avatar[\name].asSymbol }
	}

	targetNames {
		^this.currentAvatars.collect { |avatar| this.targetNameFor(avatar) }
	}

	expectedPorts {
		^this.currentAvatars.collect { |avatar| avatar[\vmcPort].asInteger }
			.select { |port| port > 0 }.asSet.asArray.sort
	}

	refreshAvatarList { |selectedIndex = 0|
		var avatars = this.currentAvatars;
		avatarList.items_(avatars.collect { |avatar|
			"% — port % (%)".format(
				this.targetNameFor(avatar), avatar[\vmcPort],
				if(avatarMappings.includesKey(this.avatarKey(avatar))) {
					"confirmed"
				} {
					avatar[\confidence]
				})
		});
		if(avatars.notEmpty) {
			selectedIndex = selectedIndex.clip(0, avatars.size - 1);
			avatarList.value_(selectedIndex);
			this.selectAvatarAt(selectedIndex)
		} {
			avatarNameField.string_("")
		};
		^this
	}

	selectAvatarAt { |index|
		var avatars = this.currentAvatars;
		if(index.inclusivelyBetween(0, avatars.size - 1)) {
			avatarNameField.string_(this.targetNameFor(avatars[index]).asString)
		};
		^this
	}

	confirmAvatarName {
		var avatars = this.currentAvatars;
		var index = avatarList.value;
		var avatar, name, duplicate;
		if(index.inclusivelyBetween(0, avatars.size - 1).not) {
			Error("Select an avatar before confirming its target name").throw
		};
		name = avatarNameField.string.stripWhiteSpace;
		if(name.isEmpty) { Error("Avatar target name may not be empty").throw };
		avatar = avatars[index];
		duplicate = avatars.detect { |other|
			(other !== avatar) and: { this.targetNameFor(other) == name.asSymbol }
		};
		if(duplicate.notNil) {
			Error("Target name is already used in this Scene: %".format(name)).throw
		};
		avatarMappings[this.avatarKey(avatar)] = name.asSymbol;
		this.refreshAvatarList(index);
		this.setStatus("Confirmed target % for node %"
			.format(name, avatar[\nodePath]));
		^name.asSymbol
	}

	sceneKey {
		if(selectedProject.isNil or: { selectedScene.isNil }) { ^nil };
		^"%|%".format(selectedProject, selectedScene).asSymbol
	}

	assignmentKey {
		if(this.sceneKey.isNil or: { selectedClipName.isNil }
			or: { selectedPresetName.isNil }) { ^nil };
		^"%|%|%".format(this.sceneKey, selectedClipName, selectedPresetName).asSymbol
	}

	refreshClips {
		var names = Bmc.refreshSavedClips;
		clipList.items_(names.collect(_.asString));
		selectedClipName = if(names.includes(selectedClipName)) {
			selectedClipName
		} {
			names.first
		};
		if(selectedClipName.notNil) {
			clipList.value_(names.indexOfEqual(selectedClipName));
			this.selectClipAt(clipList.value)
		} {
			presetList.items_(#[]);
			selectedPresetName = nil;
			frameCountBox.value_(0)
		};
		^this
	}

	selectClipAt { |index|
		var names = Bmc.savedClips;
		if(index.inclusivelyBetween(0, names.size - 1).not) { ^this };
		selectedClipName = names[index];
		this.updateFrameCount;
		this.refreshPresets;
		^this
	}

	updateFrameCount {
		var clip;
		if(Bmc.isRecording) {
			frameCountBox.value_(Bmc.recordingFrameCount);
			^this
		};
		clip = if(selectedClipName.isNil) { nil } { Bmc.clip(selectedClipName) };
		frameCountBox.value_(if(clip.isNil) { 0 } { clip.size });
		^this
	}

	refreshPresets {
		var names;
		if(selectedClipName.isNil) { presetList.items_(#[]); ^this };
		names = Bmc.clipPresets(selectedClipName);
		presetList.items_(names.collect(_.asString));
		selectedPresetName = names.first;
		if(names.notEmpty) {
			presetList.value_(0);
			this.loadSelectedPresetBones
		} {
			bodyPartsList.selection_(#[])
		};
		^this
	}

	selectPresetAt { |index|
		var names;
		if(selectedClipName.isNil) { ^this };
		names = Bmc.clipPresets(selectedClipName);
		if(index.inclusivelyBetween(0, names.size - 1)) {
			selectedPresetName = names[index];
			this.loadSelectedPresetBones
		};
		^this
	}

	loadSelectedPresetBones {
		var preset, bones, indexes;
		if(selectedClipName.isNil or: { selectedPresetName.isNil }) {
			bodyPartsList.selection_(#[]);
			^this
		};
		preset = Bmc.clipPreset(selectedClipName, selectedPresetName);
		bones = BmcBoneSets.resolve(preset.bones);
		indexes = bones.collect { |bone| Bmc.boneNames.indexOfEqual(bone) }
			.reject(_.isNil);
		bodyPartsList.selection_(indexes);
		^this
	}

	selectedBones {
		var indexes = bodyPartsList.selection ?? { #[] };
		var bones = indexes.collect { |index| Bmc.boneNames[index] };
		if(bones.size == Bmc.boneNames.size) { ^\all };
		^bones
	}

	selectedTargetNames {
		var avatars = this.currentAvatars, index = avatarList.value;
		if(index.inclusivelyBetween(0, avatars.size - 1)) {
			^[this.targetNameFor(avatars[index])]
		};
		^this.targetNames
	}

	addSelectedPresetToScene {
		var preset, targets, assigned;
		if(this.currentSceneReport.isNil) {
			Error("Select a Godot-verified Scene first").throw
		};
		if(selectedClipName.isNil or: { selectedPresetName.isNil }) {
			Error("Select a Clip and Preset first").throw
		};
		targets = this.selectedTargetNames;
		if(targets.isEmpty) { Error("The selected Scene has no avatar target").throw };
		preset = Bmc.clipPreset(selectedClipName, selectedPresetName);
		assigned = BmcClipPreset(preset.name, preset.sourceClip, preset.startFrame,
			preset.endFrame, preset.looping, preset.speed, this.selectedBones, targets,
			preset.sonificationCode, preset.modificationCode);
		scenePresetAssignments[this.assignmentKey] = assigned;
		this.setStatus("Added preset % to % for target %; % body part(s)"
			.format(selectedPresetName, selectedScene, targets.join(", "),
				BmcBoneSets.resolve(assigned.bones).size));
		^assigned
	}

	prepareAssignedTargets { |preset|
		var avatars = this.currentAvatars;
		preset.targets.do { |target|
			var detected = avatars.detect { |avatar| this.targetNameFor(avatar) == target };
			var bmcAvatar;
			if(detected.isNil) { Error("Scene target is unavailable: %".format(target)).throw };
			bmcAvatar = Bmc.avatar(target) ?? { Bmc.addAvatar(target, target.asString) };
			bmcAvatar.vmcPort_(detected[\vmcPort]);
		};
		^this
	}

	playAssignedPreset {
		var preset = scenePresetAssignments[this.assignmentKey];
		if(preset.isNil) { Error("Add the selected Preset to this Scene before playing it").throw };
		this.prepareAssignedTargets(preset);
		Bmc.playPresetObject(preset);
		this.setStatus("Playing preset % on %".format(preset.name, preset.targets.join(", ")));
		^this
	}

	stopAssignedPreset {
		Bmc.playerNames.select { |name| name.asString.beginsWith("clipEditor") }
			.do { |name| Bmc.stopPlayback(name) };
		this.setStatus("Preset playback stopped");
		^this
	}

	toggleCameraAnimation { |enabled|
		var avatars = this.currentAvatars, index = avatarList.value;
		var detected, target, bmcAvatar;
		if(enabled.not) { Bmc.stopCameraAnimation; ^this };
		if(index.inclusivelyBetween(0, avatars.size - 1).not) {
			Error("Select a Scene avatar target first").throw
		};
		detected = avatars[index];
		target = this.targetNameFor(detected);
		bmcAvatar = Bmc.avatar(target) ?? { Bmc.addAvatar(target, target.asString) };
		bmcAvatar.vmcPort_(detected[\vmcPort]);
		Bmc.cameraTarget_(target);
		this.setStatus("Animating % from camera data".format(target));
		^this
	}

	toggleClipRecording { |enabled|
		var name = newClipNameField.string.stripWhiteSpace;
		if(enabled) {
			if(name.isEmpty) { Error("Enter a new Clip name before recording").throw };
			if(Bmc.savedClips.includes(name.asSymbol)) {
				Error("Clip name already exists: %".format(name)).throw
			};
			Bmc.record(name.asSymbol, nil, Bmc.cameraSource, \rawFrame,
				(project: selectedProject, godotScene: selectedScene));
			activeRecordingName = name.asSymbol;
			frameCountBox.value_(0);
			this.setStatus("Recording Clip %".format(name))
		} {
			if(Bmc.isRecording) {
				Bmc.stopRecording;
				selectedClipName = activeRecordingName;
				activeRecordingName = nil;
				this.refreshClips;
				this.setStatus("Clip recording saved")
			}
		};
		^this
	}

	playSelectedScene {
		var scene = this.currentSceneReport;
		var project = selectedProject, scenePath = selectedScene;
		if(scene.isNil) { Error("Select a Godot-verified Scene before playing").throw };
		if(scene[\loadable] != true) { Error("The selected Godot Scene is not loadable").throw };
		if(Bmc.godotServiceReady.not) { Error("The BuMoChi Godot service is not running").throw };
		this.setStatus("Launching %...".format(scenePath));
		Bmc.playGodotScene(project, scenePath, this.expectedPorts, { |data, error|
			{
				if(project == selectedProject and: { scenePath == selectedScene }) {
					if(error.notNil) {
						runningBox.value_(0);
						listeningBox.value_(0);
						playSceneButton.value_(0);
						this.setStatus("Godot launch failed: " ++ error)
					} {
						runningBox.value_(data[\running].asInteger);
						playSceneButton.value_(data[\running].asInteger);
						this.setStatus("Godot Scene launched; checking VMC listener...")
					}
				}
			}.defer
		});
		^this
	}

	stopSelectedScene {
		var project = selectedProject, scenePath = selectedScene;
		if(project.isNil or: { scenePath.isNil }) { ^this };
		this.setStatus("Stopping Godot Scene...");
		Bmc.stopGodotScene(project, scenePath, { |data, error|
			{
				if(error.notNil) {
					this.setStatus("Could not stop Godot Scene: " ++ error)
				} {
					runningBox.value_(0);
					listeningBox.value_(0);
					playSceneButton.value_(0);
					this.setStatus("Godot Scene stopped")
				}
			}.defer
		});
		^this
	}

	updateRuntimeStatus {
		var project = selectedProject, scenePath = selectedScene;
		var ports;
		if(statusPending or: { inspection.isNil } or: { scenePath.isNil }
			or: { Bmc.godotServiceReady.not }) { ^this };
		ports = this.expectedPorts;
		statusPending = true;
		Bmc.godotSceneStatus(project, scenePath, ports, { |data, error|
			{
				statusPending = false;
				if(project == selectedProject and: { scenePath == selectedScene }) {
					if(error.notNil) {
						runningBox.value_(0);
						listeningBox.value_(0);
						playSceneButton.value_(0)
					} {
						runningBox.value_(data[\running].asInteger);
						playSceneButton.value_(data[\running].asInteger);
						listeningBox.value_(data[\listening].asInteger)
					}
				}
			}.defer
		});
		^this
	}

	refreshProjects {
		var projects = Bmc.projects;
		projectList.items_(projects.collect(_.asString));
		if(projects.isEmpty) {
			this.setStatus("No Godot projects found in " ++ Bmc.projectDirectory);
			sceneList.items_(#[]);
			avatarList.items_(#[])
		} {
			projectList.value_(0);
			this.selectProject(projects.first)
		};
		^this
	}

	selectProject { |projectName|
		var filesystemScenes;
		selectedProject = projectName.asSymbol;
		selectedScene = nil;
		runningBox.value_(0);
		listeningBox.value_(0);
		inspection = nil;
		filesystemScenes = Bmc.projectScenes(selectedProject);
		sceneList.items_(filesystemScenes);
		avatarList.items_(#[]);
		details.string_("Project folder: %\nGodot inspection pending"
			.format(BmcGodotProjectLibrary.projectPath(selectedProject)));
		if(filesystemScenes.notEmpty) {
			sceneList.value_(0);
			selectedScene = filesystemScenes.first
		};
		if(Bmc.godotServiceReady.not) {
			this.setStatus("Filesystem Scenes shown. Start the BuMoChi pipeline to verify them in Godot.");
			^this
		};
		this.setStatus("Inspecting % with Godot...".format(selectedProject));
		Bmc.inspectProjectData(selectedProject, { |data, error|
			{
				if(selectedProject == projectName.asSymbol) {
					if(error.notNil) {
						this.setStatus("Inspection failed: " ++ error)
					} {
						this.applyInspection(data)
					}
				}
			}.defer
		});
		^this
	}

	applyInspection { |data|
		var scenes;
		inspection = data;
		scenes = data[\scenes] ?? { #[] };
		sceneList.items_(scenes.collect { |scene| scene[\path].asString });
		if(scenes.notEmpty) {
			sceneList.value_(0);
			this.selectSceneAt(0)
		} {
			selectedScene = nil;
			avatarList.items_(#[])
		};
		this.setStatus("Godot verified % Scene(s) in %"
			.format(scenes.size, selectedProject));
		^this
	}

	selectSceneAt { |index|
		var scenes, scene, avatars;
		if(inspection.isNil) {
			selectedScene = sceneList.items[index];
			^this
		};
		scenes = inspection[\scenes] ?? { #[] };
		if(index.inclusivelyBetween(0, scenes.size - 1).not) { ^this };
		scene = scenes[index];
		selectedScene = scene[\path];
		avatars = scene[\avatarCandidates] ?? { #[] };
		this.refreshAvatarList;
		details.string_(
			"Godot project: %\nScene: %\nRoot node: %\nLoadable: %\nAvatars: %"
			.format(inspection[\projectName], scene[\path], scene[\rootName],
				scene[\loadable], avatars.size)
		);
		^this
	}

	build {
		{
			var refreshButton = Button().states_([["Refresh Godot projects"]]);
			window = Window("BuMoChi Asset Editor", Rect(120, 80, 1000, 720));
			projectList = ListView().minWidth_(210);
			sceneList = ListView().minWidth_(280);
			avatarList = ListView().minWidth_(260);
			avatarNameField = TextField();
			confirmAvatarButton = Button().states_([["Confirm target name"]]);
			playSceneButton = Button().states_([
				["Open Scene"], ["Close Scene"]
			]);
			runningBox = CheckBox().string_("Godot Scene running").enabled_(false);
			listeningBox = CheckBox().string_("VMC listening").enabled_(false);
			cameraDataBox = CheckBox().string_("Camera data on").enabled_(false);
			details = TextView().editable_(false).minHeight_(55).maxHeight_(75);
			statusText = TextView().editable_(false).minHeight_(32).maxHeight_(48);
			clipList = ListView().minWidth_(220);
			presetList = ListView().minWidth_(220);
			bodyPartsList = ListView().minWidth_(220).selectionMode_(\multi);
			bodyPartsList.items_(Bmc.boneNames.collect(_.asString));
			selectAllBodiesButton = Button().states_([["Select all"]]);
			unselectAllBodiesButton = Button().states_([["Unselect all"]]);
			addPresetButton = Button().states_([["Add to Scene"]]);
			playPresetButton = Button().states_([["Play"]]);
			stopPresetButton = Button().states_([["Stop"]]);
			animateCameraButton = Button().states_([
				["Animate from Camera"], ["Stop Camera Animation"]
			]);
			recordClipButton = Button().states_([
				["Record animation clip"], ["Stop recording"]
			]);
			newClipNameField = TextField();
			frameCountBox = NumberBox().decimals_(0).clipLo_(0)
				.enabled_(false).value_(0).fixedWidth_(85);
			projectList.action_({ |view|
				var names = Bmc.projects;
				if(view.value.inclusivelyBetween(0, names.size - 1)) {
					this.selectProject(names[view.value])
				}
			});
			sceneList.action_({ |view| this.selectSceneAt(view.value) });
			clipList.action_({ |view| this.selectClipAt(view.value) });
			presetList.action_({ |view| this.selectPresetAt(view.value) });
			avatarList.action_({ |view| this.selectAvatarAt(view.value) });
			confirmAvatarButton.action_({
				try { this.confirmAvatarName } { |error|
					this.showError(error)
				}
			});
			playSceneButton.action_({ |button|
				try {
					if(button.value == 1) { this.playSelectedScene } { this.stopSelectedScene }
				} { |error|
					button.value_(runningBox.value.asInteger);
					this.showError(error)
				}
			});
			addPresetButton.action_({
				try { this.addSelectedPresetToScene } { |error|
					this.showError(error)
				}
			});
			playPresetButton.action_({
				try { this.playAssignedPreset } { |error|
					this.showError(error)
				}
			});
			stopPresetButton.action_({ this.stopAssignedPreset });
			selectAllBodiesButton.action_({
				bodyPartsList.selection_((0 .. (Bmc.boneNames.size - 1)))
			});
			unselectAllBodiesButton.action_({ bodyPartsList.selection_(#[]) });
			animateCameraButton.action_({ |button|
				try { this.toggleCameraAnimation(button.value == 1) } { |error|
					button.value_(Bmc.cameraAnimationActive.asInteger);
					this.showError(error)
				}
			});
			recordClipButton.action_({ |button|
				try { this.toggleClipRecording(button.value == 1) } { |error|
					button.value_(Bmc.isRecording.asInteger);
					this.showError(error)
				}
			});
			refreshButton.action_({ this.refreshProjects });
			projectView = View().maxHeight_(350);
			projectView.layout = VLayout(
				HLayout(playSceneButton, animateCameraButton, runningBox,
					listeningBox, cameraDataBox),
				HLayout(
					VLayout(StaticText().string_("Godot projects"), projectList),
					VLayout(StaticText().string_("Godot Scenes"), sceneList),
					VLayout(
						StaticText().string_("Scene targets / detected avatars"),
						avatarList,
						StaticText().string_("Target name"),
						avatarNameField,
						confirmAvatarButton
					)
				), details,
				HLayout(refreshButton, addPresetButton, playPresetButton,
					stopPresetButton, statusText)
			);
			clipPresetView = View();
			clipPresetView.layout = VLayout(
				HLayout(
					StaticText().string_("Animation clip name"),
					newClipNameField,
					recordClipButton,
					frameCountBox,
					StaticText().string_("frames")
				),
				HLayout(
					VLayout(StaticText().string_("Animation clips"), clipList),
					VLayout(StaticText().string_("Presets"), presetList),
					VLayout(
						StaticText().string_("Body parts controlled"),
						HLayout(selectAllBodiesButton, unselectAllBodiesButton),
						bodyPartsList
					)
				)
			);
			window.layout = VLayout(projectView, clipPresetView);
			statusUpdater = Routine({
				loop {
					cameraDataBox.value_(Bmc.animationDataInputActive.asInteger);
					animateCameraButton.value_(Bmc.cameraAnimationActive.asInteger);
					recordClipButton.value_(Bmc.isRecording.asInteger);
					this.updateFrameCount;
					if(statusTick == 0) { this.updateRuntimeStatus };
					statusTick = (statusTick + 1) % 4;
					0.25.wait
				}
			}).play(AppClock);
			window.onClose_({ statusUpdater.stop });
			this.refreshProjects;
			this.refreshClips;
			window.front
		}.defer;
		^this
	}

	close {
		if(statusUpdater.notNil) { statusUpdater.stop };
		this.stopAssignedPreset;
		if(window.notNil) { window.close };
		^this
	}
}
