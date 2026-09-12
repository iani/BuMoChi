import type { DanceSourceId } from '../store/danceStore'
import { DEFAULT_CAMERA_ID, cameraConstraints } from './camera'
import {
  FixturePoseSource,
  POSE_FIXTURES,
  POSE_FIXTURE_VIDEOS,
  loadPoseFixture,
  type PoseFixtureId,
} from './fixture'
import { DuetFixturePoseSource } from './duetFixture'
import type { MultiPoseSource, PoseSource } from './types'

/** Clips run through the live MediaPipe path; these are the same CC clips the fixtures were recorded from. */
export const CLIP_VIDEOS = {
  'clip:belly-dance': POSE_FIXTURE_VIDEOS['belly-dance'],
  'clip:hiphop-whip': POSE_FIXTURE_VIDEOS['hiphop-whip'],
} as const satisfies Partial<Record<DanceSourceId, string>>

const DUET_PARTNER = {
  'belly-dance': 'hiphop-whip',
  'hiphop-whip': 'belly-dance',
} as const satisfies Record<PoseFixtureId, PoseFixtureId>

const fixtureSource = async (id: PoseFixtureId): Promise<PoseSource> =>
  new FixturePoseSource(await loadPoseFixture(POSE_FIXTURES[id]), {
    video: { element: document.createElement('video'), url: POSE_FIXTURE_VIDEOS[id] },
  })

/**
 * Resolves a source id to a running-capable PoseSource. Clips and the camera
 * share the MediaPipe live path (same frames in, same clock), so a clip is an
 * exact stand-in for a dancer in front of the camera. MediaPipe (WASM + model,
 * ~18 MB) is loaded lazily and only for those; the fixture replay stays ML-free.
 */
export async function createPoseSource(
  id: DanceSourceId,
  cameraId: string = DEFAULT_CAMERA_ID,
): Promise<PoseSource> {
  switch (id) {
    case 'clip:belly-dance':
    case 'clip:hiphop-whip': {
      const { MediaPipePoseSource } = await import('./mediapipeSource')
      return new MediaPipePoseSource({ kind: 'video', url: CLIP_VIDEOS[id] })
    }
    case 'camera': {
      const { MediaPipePoseSource } = await import('./mediapipeSource')
      return new MediaPipePoseSource({ kind: 'camera', constraints: cameraConstraints(cameraId) })
    }
    case 'fixture:belly-dance':
      return fixtureSource('belly-dance')
    case 'fixture:hiphop-whip':
      return fixtureSource('hiphop-whip')
    default:
      throw new Error(`Unknown pose source: ${String(id)}`)
  }
}

/**
 * Same sources, two people: clips and the camera ask MediaPipe for two poses;
 * a fixture replay pairs the chosen clip's landmarks with the other clip's.
 */
export async function createDuetPoseSource(
  id: DanceSourceId,
  cameraId: string = DEFAULT_CAMERA_ID,
): Promise<MultiPoseSource> {
  switch (id) {
    case 'clip:belly-dance':
    case 'clip:hiphop-whip': {
      const { MediaPipePoseSource } = await import('./mediapipeSource')
      return new MediaPipePoseSource({ kind: 'video', url: CLIP_VIDEOS[id] }, undefined, { numPoses: 2 })
    }
    case 'camera': {
      const { MediaPipePoseSource } = await import('./mediapipeSource')
      return new MediaPipePoseSource(
        { kind: 'camera', constraints: cameraConstraints(cameraId) },
        undefined,
        { numPoses: 2 },
      )
    }
    case 'fixture:belly-dance':
      return duetFixtureSource('belly-dance')
    case 'fixture:hiphop-whip':
      return duetFixtureSource('hiphop-whip')
    default:
      throw new Error(`Unknown pose source: ${String(id)}`)
  }
}

const duetFixtureSource = async (id: PoseFixtureId): Promise<MultiPoseSource> => {
  const [left, right] = await Promise.all([
    loadPoseFixture(POSE_FIXTURES[id]),
    loadPoseFixture(POSE_FIXTURES[DUET_PARTNER[id]]),
  ])
  return new DuetFixturePoseSource(left, right)
}
