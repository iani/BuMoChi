extends Node3D


# Keep body and face tracking immediate while damping only the yukata cloth.
# A drag value of 0.8 retains roughly one fifth of the previous-frame motion.
const YUKATA_DRAG := 0.8


func _ready() -> void:
	var avatar := $Chan/ChanAvatar/Ishidomaru
	for spring_bone in avatar.spring_bones:
		if not "CoatSkirt" in str(spring_bone.joint_nodes):
			continue

		var joint_drag := PackedFloat64Array()
		joint_drag.resize(spring_bone.joint_nodes.size())
		joint_drag.fill(YUKATA_DRAG)
		joint_drag[-1] = 1.0
		spring_bone.drag_force_scale = 1.0
		spring_bone.drag_force = joint_drag


# Process movement based on keyboard
func _process(delta : float) -> void:
	var xform : Transform3D = %Camera3D.global_transform

	# Handle normal W/A/S/D/Q/E buttons
	if Input.is_key_pressed(KEY_A):
		xform.origin -= xform.basis.x * delta * 2.0
	if Input.is_key_pressed(KEY_D):
		xform.origin += xform.basis.x * delta * 2.0
	if Input.is_key_pressed(KEY_W):
		xform.origin -= xform.basis.z * delta * 2.0
	if Input.is_key_pressed(KEY_S):
		xform.origin += xform.basis.z * delta * 2.0
	if Input.is_key_pressed(KEY_Q):
		xform.origin -= xform.basis.y * delta * 2.0
	if Input.is_key_pressed(KEY_E):
		xform.origin += xform.basis.y * delta * 2.0

	%Camera3D.global_transform = xform


# Process movement based on mouse events
func _input(event : InputEvent) -> void:
	var xform : Transform3D = %Camera3D.global_transform

	# Handle rotation by right-mouse-drag
	var motion := event as InputEventMouseMotion
	if motion and motion.button_mask & MOUSE_BUTTON_MASK_RIGHT:
		xform.basis = Basis(Vector3.UP, -motion.relative.x * 0.001) * xform.basis
		xform.basis = Basis(xform.basis.x, -motion.relative.y * 0.001) * xform.basis

	# Handle mouse capture and mouse-wheel movement in/out
	var button := event as InputEventMouseButton
	if button and button.pressed and button.button_index == MOUSE_BUTTON_RIGHT:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	if button and not button.pressed and button.button_index == MOUSE_BUTTON_RIGHT:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	if button and button.button_index == MOUSE_BUTTON_WHEEL_UP:
		xform.origin -= xform.basis.z * 0.1
	if button and button.button_index == MOUSE_BUTTON_WHEEL_DOWN:
		xform.origin += xform.basis.z * 0.1

	%Camera3D.global_transform = xform


func _on_skeleton_spin_box_value_changed(value: float) -> void:
	$"Chan/ChanAvatar/Ishidomaru/GeneralSkeleton".motion_scale = value


func _on_world_spin_box_value_changed(value: float) -> void:
	XRServer.world_scale = value
