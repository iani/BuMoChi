import { describe, expect, it, vi } from 'vitest'
import { fakeClock, fixtureFrame, makeFixture, standingPose } from '../test/pose'
import {
  FixturePoseSource,
  VIDEO_DRIFT_TOLERANCE_MS,
  isPoseFixture,
  loadPoseFixture,
  toPoseFrame,
} from './fixture'
import type { PoseFrame } from './types'
import { POSE_LANDMARK_COUNT } from './types'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('isPoseFixture', () => {
  it('should accept a well-formed fixture', () => {
    // GIVEN
    const fixture = makeFixture([fixtureFrame(0), fixtureFrame(100)])
    // WHEN / THEN
    expect(isPoseFixture(fixture)).toBe(true)
  })

  it('should accept frames where the dancer is not detected', () => {
    // GIVEN
    const fixture = makeFixture([{ t: 0, landmarks: null, world: null }])
    // WHEN / THEN
    expect(isPoseFixture(fixture)).toBe(true)
  })

  const invalid: readonly (readonly [string, unknown])[] = [
    ['wrong version', { ...makeFixture([]), version: 2 }],
    ['missing video', { ...makeFixture([]), video: undefined }],
    ['non-numeric sampleFps', { ...makeFixture([]), sampleFps: '15' }],
    [
      'frame with 32 landmarks',
      makeFixture([{ ...fixtureFrame(0), landmarks: fixtureFrame(0).landmarks?.slice(1) ?? null }]),
    ],
    [
      'frame with 3-tuple image landmarks',
      { ...makeFixture([]), frames: [{ t: 0, landmarks: standingPose().map((p) => [p.x, p.y, p.z]), world: null }] },
    ],
    ['frame with non-numeric t', { ...makeFixture([]), frames: [{ t: 'now', landmarks: null, world: null }] }],
    ['not an object', 42],
  ]

  it.each(invalid)('should reject %s', (_label, payload) => {
    // WHEN / THEN
    expect(isPoseFixture(payload)).toBe(false)
  })
})

describe('loadPoseFixture', () => {
  it('should fetch and return a valid fixture', async () => {
    // GIVEN
    const fixture = makeFixture([fixtureFrame(0)])
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(fixture))
    // WHEN
    const loaded = await loadPoseFixture('/fixtures/pose/x.json', fetchMock)
    // THEN
    expect(fetchMock).toHaveBeenCalledWith('/fixtures/pose/x.json')
    expect(loaded).toStrictEqual(fixture)
  })

  it('should throw on a non-2xx response', async () => {
    // GIVEN
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({}, 404))
    // WHEN / THEN
    await expect(loadPoseFixture('/missing.json', fetchMock)).rejects.toThrow('404')
  })

  it('should throw on an invalid payload', async () => {
    // GIVEN
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ version: 1 }))
    // WHEN / THEN
    await expect(loadPoseFixture('/bad.json', fetchMock)).rejects.toThrow('Unexpected pose fixture payload')
  })
})

describe('toPoseFrame', () => {
  it('should expand compact tuples into landmark objects', () => {
    // GIVEN
    const frame = fixtureFrame(120, standingPose({ x: 0.4 }))
    // WHEN
    const pose = toPoseFrame(frame)
    // THEN
    expect(pose.t).toBe(120)
    expect(pose.landmarks).toHaveLength(POSE_LANDMARK_COUNT)
    expect(pose.landmarks?.[0]).toStrictEqual({ x: 0.4, y: 0.2, z: 0, visibility: 1 })
    expect(pose.world).toBeNull()
  })
})

describe('FixturePoseSource', () => {
  it('should replay frames at their recorded timing, rebased to zero', async () => {
    // GIVEN
    const clock = fakeClock()
    const fixture = makeFixture([fixtureFrame(500), fixtureFrame(600), fixtureFrame(700)])
    const source = new FixturePoseSource(fixture, { loop: false, scheduler: clock })
    const seen: PoseFrame[] = []
    // WHEN
    await source.start((f) => seen.push(f))
    clock.advance(100)
    const afterOneStep = seen.length
    clock.advance(1000)
    // THEN
    expect(afterOneStep).toBe(2)
    expect(seen.map((f) => f.t)).toStrictEqual([0, 100, 200])
  })

  it('should loop with a continuous timeline when loop is enabled', async () => {
    // GIVEN
    const clock = fakeClock()
    const fixture = makeFixture([fixtureFrame(0), fixtureFrame(100)], 10)
    const source = new FixturePoseSource(fixture, { scheduler: clock })
    const seen: number[] = []
    // WHEN
    await source.start((f) => seen.push(f.t))
    clock.advance(450)
    // THEN
    expect(seen).toStrictEqual([0, 100, 200, 300, 400])
  })

  it('should stop emitting after stop()', async () => {
    // GIVEN
    const clock = fakeClock()
    const source = new FixturePoseSource(makeFixture([fixtureFrame(0), fixtureFrame(100)]), { scheduler: clock })
    const seen: number[] = []
    await source.start((f) => seen.push(f.t))
    // WHEN
    source.stop()
    clock.advance(1000)
    // THEN
    expect(seen).toStrictEqual([0])
  })

  it('should play the source clip underneath and re-seek it to 0 at each lap boundary', async () => {
    // GIVEN
    const clock = fakeClock()
    const element = document.createElement('video')
    const seeks: number[] = []
    const play = vi.fn<() => Promise<void>>(() => Promise.resolve())
    const pause = vi.fn<() => void>()
    Object.defineProperties(element, {
      currentTime: { set: (v: number) => seeks.push(v), get: () => 0 },
      play: { value: play },
      pause: { value: pause },
    })
    const source = new FixturePoseSource(makeFixture([fixtureFrame(0), fixtureFrame(100)], 10), {
      scheduler: clock,
      video: { element, url: 'https://example.test/clip.webm' },
    })
    // WHEN
    await source.start(() => {})
    clock.advance(150)
    const seeksBeforeLap = [...seeks]
    clock.advance(100)
    source.stop()
    // THEN
    expect(seeksBeforeLap).toStrictEqual([0])
    expect(source.videoElement).toBe(element)
    expect(source.frameAspect).toBeCloseTo(640 / 360)
    expect(element.src).toBe('https://example.test/clip.webm')
    expect(element.muted).toBe(true)
    expect(seeks).toStrictEqual([0, 0])
    expect(play).toHaveBeenCalledTimes(2)
    expect(pause).toHaveBeenCalledTimes(1)
  })

  it('should re-seek the clip to the replay position once it drifts past the tolerance', async () => {
    // GIVEN a clip that started late and sits 600 ms behind the landmarks
    const clock = fakeClock()
    const element = document.createElement('video')
    const seeks: number[] = []
    let currentTime = 0
    Object.defineProperties(element, {
      currentTime: {
        set: (v: number) => {
          currentTime = v
          seeks.push(v)
        },
        get: () => currentTime,
      },
      readyState: { get: () => HTMLMediaElement.HAVE_ENOUGH_DATA },
      play: { value: () => Promise.resolve() },
      pause: { value: () => {} },
    })
    const frames = [0, 100, 200, 300, 400, 500, 600, 700, 800].map((t) => fixtureFrame(t))
    const source = new FixturePoseSource(makeFixture(frames, 10), {
      scheduler: clock,
      video: { element, url: 'https://example.test/clip.webm' },
    })
    // WHEN
    await source.start(() => {})
    clock.advance(VIDEO_DRIFT_TOLERANCE_MS)
    const seeksWithinTolerance = [...seeks]
    clock.advance(350)
    source.stop()
    // THEN
    expect(seeksWithinTolerance).toStrictEqual([0])
    expect(seeks).toStrictEqual([0, 0.3])
  })

  it('should keep replaying when the clip refuses to play', async () => {
    // GIVEN
    const clock = fakeClock()
    const element = document.createElement('video')
    Object.defineProperties(element, {
      play: { value: () => Promise.reject(new Error('NotAllowedError')) },
      pause: { value: () => {} },
    })
    const source = new FixturePoseSource(makeFixture([fixtureFrame(0), fixtureFrame(100)], 10), {
      scheduler: clock,
      video: { element, url: 'https://example.test/clip.webm' },
    })
    const seen: number[] = []
    // WHEN
    await source.start((f) => seen.push(f.t))
    clock.advance(250)
    await Promise.resolve()
    // THEN
    expect(seen).toStrictEqual([0, 100, 200])
  })

  it('should resolve immediately for an empty fixture', async () => {
    // GIVEN
    const onFrame = vi.fn<(f: PoseFrame) => void>()
    // WHEN
    await new FixturePoseSource(makeFixture([]), { scheduler: fakeClock() }).start(onFrame)
    // THEN
    expect(onFrame).not.toHaveBeenCalled()
  })
})
