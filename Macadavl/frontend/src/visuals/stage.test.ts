import { describe, expect, it } from 'vitest'
import { clearScene, emptyDancer, emptyScene, fitFrame, type StageScene } from './stage'

describe('clearScene', () => {
  it('should drop every frame-dependent field so no stale skeleton overlays the next source', () => {
    // GIVEN
    const scene: StageScene = {
      dancers: [
        { ...emptyDancer(), pose: { t: 10, landmarks: [], world: null }, pulse: 0.7 },
        { ...emptyDancer(), pose: { t: 10, landmarks: [], world: null }, pulse: 0.2 },
      ],
      video: document.createElement('video'),
      frameAspect: 16 / 9,
    }
    // WHEN
    clearScene(scene)
    // THEN
    expect(scene).toStrictEqual(emptyScene())
  })
})

describe('fitFrame', () => {
  it('should fill the canvas when the frame aspect is unknown', () => {
    // WHEN / THEN
    expect(fitFrame(960, 540, null)).toStrictEqual({ x: 0, y: 0, w: 960, h: 540 })
  })

  it.each([
    ['a portrait clip is pillarboxed', 9 / 16, { x: 328.125, y: 0, w: 303.75, h: 540 }],
    ['a wide clip is letterboxed', 32 / 9, { x: 0, y: 135, w: 960, h: 270 }],
    ['a matching clip fills the canvas', 16 / 9, { x: 0, y: 0, w: 960, h: 540 }],
  ])('should centre the frame so %s', (_label, aspect, expected) => {
    // WHEN
    const rect = fitFrame(960, 540, aspect)
    // THEN
    expect(rect.x).toBeCloseTo(expected.x)
    expect(rect.y).toBeCloseTo(expected.y)
    expect(rect.w).toBeCloseTo(expected.w)
    expect(rect.h).toBeCloseTo(expected.h)
  })

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'should fall back to the full canvas for the degenerate aspect %s',
    (aspect) => {
      // WHEN / THEN
      expect(fitFrame(100, 50, aspect)).toStrictEqual({ x: 0, y: 0, w: 100, h: 50 })
    },
  )
})
