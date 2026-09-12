"""Extract MediaPipe Pose landmarks from a video into a compact JSON fixture.

Usage: python3 extract_landmarks.py <video> <out.json> [--fps 15] [--max-seconds 30]
"""
from __future__ import annotations

import argparse
import json
import sys

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

MODEL = "pose_landmarker_lite.task"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--fps", type=float, default=15.0)
    ap.add_argument("--max-seconds", type=float, default=30.0)
    ap.add_argument("--source", default="")
    ap.add_argument("--license", default="")
    args = ap.parse_args()

    cap = cv2.VideoCapture(args.video)
    src_fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    step_ms = 1000.0 / args.fps

    options = vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    frames: list[dict[str, object]] = []
    next_sample_ms = 0.0
    detected = 0
    with vision.PoseLandmarker.create_from_options(options) as lm:
        idx = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            # Presentation timestamps, not frame index / fps: VFR clips (common on
            # Wikimedia) otherwise replay too fast against the video.
            pos_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
            t_ms = pos_ms if pos_ms > 0 or idx == 0 else idx * 1000.0 / src_fps
            idx += 1
            if t_ms > args.max_seconds * 1000:
                break
            if t_ms + 1e-6 < next_sample_ms:
                continue
            next_sample_ms += step_ms
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            res = lm.detect_for_video(image, int(t_ms))
            if res.pose_landmarks:
                detected += 1
                img = [
                    [round(p.x, 4), round(p.y, 4), round(p.z, 4), round(p.visibility, 3)]
                    for p in res.pose_landmarks[0]
                ]
                world = [
                    [round(p.x, 4), round(p.y, 4), round(p.z, 4)] for p in res.pose_world_landmarks[0]
                ]
                frames.append({"t": round(t_ms), "landmarks": img, "world": world})
            else:
                frames.append({"t": round(t_ms), "landmarks": None, "world": None})
    out = {
        "version": 1,
        "source": args.source,
        "license": args.license,
        "video": {"width": width, "height": height, "fps": src_fps},
        "sampleFps": args.fps,
        "frames": frames,
    }
    with open(args.out, "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(f"{len(frames)} frames, {detected} with pose, -> {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
