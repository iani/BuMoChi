import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaPipePoseSource } from './mediapipeSource'
import type { ImageLandmark, MultiPoseFrame, PoseFrame } from './types'

const detectTimestamps: number[] = []
const numPosesCalls: number[] = []
let detected: ImageLandmark[][] = []

vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: {
    forVisionTasks: vi.fn<() => Promise<object>>(() => Promise.resolve({})),
  },
  PoseLandmarker: {
    createFromOptions: vi.fn<() => Promise<object>>(() =>
      Promise.resolve({
        detectForVideo: (_video: HTMLVideoElement, timestamp: number) => {
          const last = detectTimestamps.at(-1)
          if (last !== undefined && timestamp <= last) {
            throw new Error(`INVALID_ARGUMENT: expected > ${last}, received ${timestamp}`)
          }
          detectTimestamps.push(timestamp)
          return { landmarks: detected, worldLandmarks: [] }
        },
        setOptions: (options: { numPoses?: number }) => {
          numPosesCalls.push(options.numPoses ?? -1)
          return Promise.resolve()
        },
      }),
    ),
  },
}))

interface FakeVideo {
  element: HTMLVideoElement
  seek: (seconds: number) => void
}

const fakeVideo = (): FakeVideo => {
  const element = document.createElement('video')
  let currentTime = 0
  Object.defineProperties(element, {
    currentTime: {
      get: () => currentTime,
      set: (v: number) => (currentTime = v),
    },
    readyState: { get: () => HTMLMediaElement.HAVE_ENOUGH_DATA },
    play: { value: vi.fn<() => Promise<void>>(() => Promise.resolve()) },
    pause: { value: vi.fn<() => void>() },
  })
  return { element, seek: (seconds) => (currentTime = seconds) }
}

let rafCallbacks = new Map<number, FrameRequestCallback>()
let rafId = 0
const flushFrame = (): void => {
  const pending = [...rafCallbacks.values()]
  rafCallbacks = new Map()
  for (const cb of pending) {
    cb(performance.now())
  }
}

describe('MediaPipePoseSource', () => {
  beforeEach(() => {
    detectTimestamps.length = 0
    numPosesCalls.length = 0
    detected = []
    rafCallbacks = new Map()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      rafId += 1
      rafCallbacks.set(rafId, cb)
      return rafId
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
      rafCallbacks.delete(id)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should keep landmarker timestamps strictly increasing across a loop rewind and a restart', async () => {
    // GIVEN
    const video = fakeVideo()
    const frames: PoseFrame[] = []
    const onFrame = (f: PoseFrame): void => {
      frames.push(f)
    }
    const first = new MediaPipePoseSource({ kind: 'video', url: 'blob:demo' }, video.element)

    // WHEN — play to 22 s, loop back to 0.5 s, stop, then restart from 7 s
    await first.start(onFrame)
    video.seek(1)
    flushFrame()
    video.seek(22)
    flushFrame()
    video.seek(0.5)
    flushFrame()
    first.stop()

    const second = new MediaPipePoseSource({ kind: 'video', url: 'blob:demo' }, video.element)
    await second.start(onFrame)
    video.seek(7)
    flushFrame()
    video.seek(7.5)
    flushFrame()
    second.stop()

    // THEN
    expect(detectTimestamps).toHaveLength(5)
    expect(detectTimestamps.every((t, i) => i === 0 || t > (detectTimestamps[i - 1] ?? -1))).toBe(
      true,
    )
    expect(frames.map((f) => f.t)).toStrictEqual(detectTimestamps)
  })

  it('should not emit a frame twice for the same video time', async () => {
    // GIVEN
    const video = fakeVideo()
    const source = new MediaPipePoseSource({ kind: 'video', url: 'blob:demo' }, video.element)
    const onFrame = vi.fn<(f: PoseFrame) => void>()

    // WHEN
    await source.start(onFrame)
    video.seek(2)
    flushFrame()
    flushFrame()
    source.stop()

    // THEN
    expect(onFrame).toHaveBeenCalledTimes(1)
  })

  it('should ask the landmarker for one pose by default and hand the first person to single-pose listeners', async () => {
    // GIVEN
    const video = fakeVideo()
    const source = new MediaPipePoseSource({ kind: 'video', url: 'blob:demo' }, video.element)
    const frames: PoseFrame[] = []
    detected = [[{ x: 0.2, y: 0.5, z: 0, visibility: 1 }], [{ x: 0.8, y: 0.5, z: 0, visibility: 1 }]]

    // WHEN
    await source.start((f) => frames.push(f))
    video.seek(1)
    flushFrame()
    source.stop()

    // THEN
    expect(numPosesCalls).toStrictEqual([1])
    expect(frames[0]?.landmarks?.[0]?.x).toBe(0.2)
  })

  it('should ask the landmarker for every seat and emit all detected people to multi-pose listeners', async () => {
    // GIVEN
    const video = fakeVideo()
    const source = new MediaPipePoseSource({ kind: 'video', url: 'blob:demo' }, video.element, {
      numPoses: 2,
    })
    const frames: MultiPoseFrame[] = []
    detected = [[{ x: 0.2, y: 0.5, z: 0, visibility: 1 }], [{ x: 0.8, y: 0.5, z: 0, visibility: 1 }]]

    // WHEN
    await source.startMulti((f) => frames.push(f))
    video.seek(1)
    flushFrame()
    detected = []
    video.seek(2)
    flushFrame()
    source.stop()

    // THEN
    expect(numPosesCalls).toStrictEqual([2])
    expect(frames.map((f) => f.poses.map((p) => p.landmarks[0]?.x))).toStrictEqual([[0.2, 0.8], []])
    expect(frames[0]?.poses[0]?.world).toBeNull()
  })
})
