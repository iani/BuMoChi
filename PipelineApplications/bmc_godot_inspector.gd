extends SceneTree

const OUTPUT_PREFIX := "BMC_GODOT_INSPECTION="

var output_path := ""


func _init() -> void:
	var args := OS.get_cmdline_user_args()
	var index := 0
	while index < args.size():
		if args[index] == "--output" and index + 1 < args.size():
			output_path = args[index + 1]
			index += 1
		index += 1
	call_deferred("_inspect_project")


func _inspect_project() -> void:
	var result := {
		"format": "bumochiGodotInspection",
		"formatVersion": 1,
		"projectName": ProjectSettings.get_setting("application/config/name", ""),
		"projectPath": ProjectSettings.globalize_path("res://"),
		"projectTrackerDefaults": _project_tracker_defaults(),
		"scenes": [],
		"errors": []
	}

	for scene_path in _discover_scene_paths():
		result.scenes.append(_inspect_scene(scene_path, result.projectTrackerDefaults))

	var json := JSON.stringify(result, "  ")
	if not output_path.is_empty():
		var file := FileAccess.open(output_path, FileAccess.WRITE)
		if file == null:
			result.errors.append("Could not write inspection output: %s" % output_path)
			json = JSON.stringify(result, "  ")
		else:
			file.store_string(json)
			file.close()
	print(OUTPUT_PREFIX + json)
	quit(0 if result.errors.is_empty() else 1)


func _discover_scene_paths() -> Array[String]:
	var paths: Array[String] = []
	for file_name in DirAccess.get_files_at("res://"):
		if file_name.get_extension().to_lower() == "tscn":
			paths.append("res://" + file_name)
	_collect_scenes("res://scenes", paths)
	paths.sort()
	return paths


func _collect_scenes(directory: String, paths: Array[String]) -> void:
	var dir := DirAccess.open(directory)
	if dir == null:
		return
	for file_name in dir.get_files():
		if file_name.get_extension().to_lower() == "tscn":
			paths.append(directory.path_join(file_name))
	for child_name in dir.get_directories():
		_collect_scenes(directory.path_join(child_name), paths)


func _project_tracker_defaults() -> Dictionary:
	return {
		"enabled": ProjectSettings.has_setting("autoload/VmcPlugin"),
		"source": "autoload/VmcPlugin",
		"udpListenerPort": int(ProjectSettings.get_setting(
			"godot_vmc_tracker/network/udp_listener_port", 39539)),
		"bodyTrackerName": str(ProjectSettings.get_setting(
			"godot_vmc_tracker/tracking/body_tracker_name", "/vmc/body_tracker")),
		"faceTrackerName": str(ProjectSettings.get_setting(
			"godot_vmc_tracker/tracking/face_tracker_name", "/vmc/face_tracker"))
	}


func _inspect_scene(scene_path: String, project_tracker_defaults: Dictionary) -> Dictionary:
	var report := {
		"path": scene_path,
		"loadable": false,
		"rootName": "",
		"avatarCandidates": [],
		"trackerInterfaces": [],
		"errors": []
	}
	var packed := ResourceLoader.load(scene_path, "PackedScene") as PackedScene
	if packed == null:
		report.errors.append("Could not load Scene as PackedScene")
		return report
	var root := packed.instantiate()
	if root == null:
		report.errors.append("Could not instantiate Scene")
		return report
	report.loadable = true
	report.rootName = str(root.name)
	_scan_node(root, root, report)
	_assign_effective_ports(report, project_tracker_defaults)
	root.free()
	return report


func _assign_effective_ports(report: Dictionary, project_tracker_defaults: Dictionary) -> void:
	for candidate in report.avatarCandidates:
		for interface in report.trackerInterfaces:
			if candidate.tracker == interface.bodyTrackerName:
				candidate.vmcPort = interface.udpListenerPort
		if candidate.vmcPort == 0 \
			and project_tracker_defaults.enabled \
			and candidate.tracker == project_tracker_defaults.bodyTrackerName:
			candidate.vmcPort = project_tracker_defaults.udpListenerPort


func _scan_node(node: Node, scene_root: Node, report: Dictionary) -> void:
	var explicit_name := str(node.get_meta("bumochi_avatar_name", ""))
	var is_xr_avatar := node.get_class() == "XRNode3D" and _has_property(node, "tracker")
	if not explicit_name.is_empty() or is_xr_avatar:
		var inferred_name := str(node.name)
		if explicit_name.is_empty() and inferred_name.to_lower() == "avatar" and node.get_parent() != null:
			inferred_name = str(node.get_parent().name)
		var candidate := {
			"name": explicit_name if not explicit_name.is_empty() else inferred_name,
			"confidence": "explicit" if not explicit_name.is_empty() else "inferred",
			"nodePath": str(scene_root.get_path_to(node)),
			"nodeType": node.get_class(),
			"tracker": str(node.get("tracker")) if _has_property(node, "tracker") else "",
			"vmcPort": int(node.get_meta("bumochi_vmc_port", 0))
		}
		report.avatarCandidates.append(candidate)

	if _has_property(node, "udp_listener_port"):
		report.trackerInterfaces.append({
			"nodePath": str(scene_root.get_path_to(node)),
			"nodeType": node.get_class(),
			"udpListenerPort": int(node.get("udp_listener_port")),
			"bodyTrackerName": str(node.get("body_tracker_name")) if _has_property(node, "body_tracker_name") else "",
			"faceTrackerName": str(node.get("face_tracker_name")) if _has_property(node, "face_tracker_name") else ""
		})

	for child in node.get_children():
		_scan_node(child, scene_root, report)


func _has_property(object: Object, property_name: String) -> bool:
	for property in object.get_property_list():
		if str(property.name) == property_name:
			return true
	return false
