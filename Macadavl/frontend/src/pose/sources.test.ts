import { describe, expect, it, vi } from 'vitest'
import { POSE_FIXTURE_VIDEOS } from './fixture'
import type { MediaPipeInput, MediaPipeSourceOptions } from './mediapipeSource'
import { CLIP_VIDEOS, createDuetPoseSource, createPoseSource } from './sources'

const constructed: MediaPipeInput[] = []
const constructedNumPoses: number[] = []

vi.mock('./mediapipeSource', () => ({
  MediaPipePoseSource: class {
    readonly kind = 'video'
    readonly videoElement = null
    readonly frameAspect = null
    constructor(input: MediaPipeInput, _video?: HTMLVideoElement, options?: MediaPipeSourceOptions) {
      constructed.push(input)
      constructedNumPoses.push(options?.numPoses ?? 1)
    }
    start(): Promise<void> {
      return Promise.resolve()
    }
    stop(): void {}
  },
}))

describe('createPoseSource', () => {
  it.each([
    ['clip:belly-dance', POSE_FIXTURE_VIDEOS['belly-dance']],
    ['clip:hiphop-whip', POSE_FIXTURE_VIDEOS['hiphop-whip']],
  ] as const)('should run %s through the live MediaPipe video path on its own clip', async (id, url) => {
    // GIVEN
    constructed.length = 0
    // WHEN
    await createPoseSource(id)
    // THEN
    expect(constructed).toStrictEqual([{ kind: 'video', url }])
    expect(CLIP_VIDEOS[id]).toBe(url)
  })

  it('should pass the chosen camera constraints to the live MediaPipe camera path', async () => {
    // GIVEN
    constructed.length = 0
    // WHEN
    await createPoseSource('camera', 'facing:environment')
    // THEN
    expect(constructed).toStrictEqual([
      {
        kind: 'camera',
        constraints: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
      },
    ])
  })

  it('should ask MediaPipe for one person by default', async () => {
    // GIVEN
    constructedNumPoses.length = 0
    // WHEN
    await createPoseSource('clip:belly-dance')
    // THEN
    expect(constructedNumPoses).toStrictEqual([1])
  })
})

describe('createDuetPoseSource', () => {
  it.each(['clip:belly-dance', 'clip:hiphop-whip', 'camera'] as const)(
    'should ask MediaPipe for two people on %s',
    async (id) => {
      // GIVEN
      constructedNumPoses.length = 0
      // WHEN
      await createDuetPoseSource(id)
      // THEN
      expect(constructedNumPoses).toStrictEqual([2])
    },
  )
})
