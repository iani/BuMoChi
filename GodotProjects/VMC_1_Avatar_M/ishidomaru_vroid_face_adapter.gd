class_name IshidomaruVRoidFaceAdapter
extends Node

## Supplements XRFaceModifier3D by mapping Godot face-tracker channels to
## the VRoid blend-shape names used by Ishidomaru.

@export var face_tracker: StringName = &"/vmc/face_tracker"
@export_node_path("MeshInstance3D") var target: NodePath

var _target_mesh: MeshInstance3D
var _shape_indices: Dictionary = {}

const SHAPE_INPUTS := {
	"Fcl_EYE_Close_L": [XRFaceTracker.FT_EYE_CLOSED_LEFT, XRFaceTracker.FT_EYE_CLOSED],
	"Fcl_EYE_Close_R": [XRFaceTracker.FT_EYE_CLOSED_RIGHT, XRFaceTracker.FT_EYE_CLOSED],
	"Fcl_EYE_Joy_L": [XRFaceTracker.FT_EYE_SQUINT_LEFT, XRFaceTracker.FT_EYE_SQUINT],
	"Fcl_EYE_Joy_R": [XRFaceTracker.FT_EYE_SQUINT_RIGHT, XRFaceTracker.FT_EYE_SQUINT],
	"Fcl_EYE_Surprised": [XRFaceTracker.FT_EYE_WIDE_LEFT, XRFaceTracker.FT_EYE_WIDE_RIGHT, XRFaceTracker.FT_EYE_WIDE],
	"Fcl_BRW_Angry": [XRFaceTracker.FT_BROW_DOWN_LEFT, XRFaceTracker.FT_BROW_DOWN_RIGHT, XRFaceTracker.FT_BROW_DOWN],
	"Fcl_BRW_Surprised": [XRFaceTracker.FT_BROW_OUTER_UP_LEFT, XRFaceTracker.FT_BROW_OUTER_UP_RIGHT],
	"Fcl_MTH_A": [XRFaceTracker.FT_JAW_OPEN],
	"Fcl_MTH_I": [XRFaceTracker.FT_MOUTH_STRETCH_LEFT, XRFaceTracker.FT_MOUTH_STRETCH_RIGHT, XRFaceTracker.FT_MOUTH_STRETCH],
	"Fcl_MTH_U": [XRFaceTracker.FT_LIP_PUCKER],
	"Fcl_MTH_O": [XRFaceTracker.FT_LIP_FUNNEL],
	"Fcl_MTH_Joy": [XRFaceTracker.FT_MOUTH_SMILE_LEFT, XRFaceTracker.FT_MOUTH_SMILE_RIGHT, XRFaceTracker.FT_MOUTH_SMILE],
	"Fcl_MTH_Sorrow": [XRFaceTracker.FT_MOUTH_FROWN_LEFT, XRFaceTracker.FT_MOUTH_FROWN_RIGHT],
	"Fcl_MTH_Angry": [XRFaceTracker.FT_MOUTH_PRESS_LEFT, XRFaceTracker.FT_MOUTH_PRESS_RIGHT, XRFaceTracker.FT_MOUTH_PRESS],
	"Fcl_MTH_Up": [XRFaceTracker.FT_MOUTH_UPPER_UP_LEFT, XRFaceTracker.FT_MOUTH_UPPER_UP_RIGHT, XRFaceTracker.FT_MOUTH_UPPER_UP],
	"Fcl_MTH_Down": [XRFaceTracker.FT_MOUTH_LOWER_DOWN_LEFT, XRFaceTracker.FT_MOUTH_LOWER_DOWN_RIGHT, XRFaceTracker.FT_MOUTH_LOWER_DOWN],
}


func _ready() -> void:
	_target_mesh = get_node_or_null(target) as MeshInstance3D
	if _target_mesh == null or _target_mesh.mesh == null:
		push_warning("IshidomaruVRoidFaceAdapter target is not a valid face mesh")
		set_process(false)
		return

	for shape_index in _target_mesh.mesh.get_blend_shape_count():
		var shape_name := str(_target_mesh.mesh.get_blend_shape_name(shape_index))
		for suffix in SHAPE_INPUTS:
			if shape_name.ends_with(suffix):
				_shape_indices[suffix] = shape_index

	if _shape_indices.is_empty():
		push_warning("IshidomaruVRoidFaceAdapter found no supported VRoid blend shapes")


func _process(_delta: float) -> void:
	var tracker := XRServer.get_tracker(face_tracker) as XRFaceTracker
	if tracker == null:
		return

	for suffix in _shape_indices:
		var weight := 0.0
		for tracker_shape in SHAPE_INPUTS[suffix]:
			weight = max(weight, tracker.get_blend_shape(tracker_shape))
		_target_mesh.set_blend_shape_value(_shape_indices[suffix], clampf(weight, 0.0, 1.0))
