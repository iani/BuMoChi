import type { FeatureFrame } from '../features/types'
import type { ControlFrame, ControlParamId } from '../mapping/types'
import type { PoseFrame } from '../pose/types'
import { LANDMARK, POSE_CONNECTIONS } from '../pose/types'

export interface StagePalette {
  bg: string
  ink: string
  muted: string
  a1: string
  a2: string
  a3: string
  a4: string
}

/** One dancer's latest frame plus the decaying hit pulse drawn as a ring. */
export interface StageDancer {
  pose: PoseFrame | null
  features: FeatureFrame | null
  control: ControlFrame | null
  pulse: number
}

export interface StageScene {
  /** Dancer A first, dancer B second; solo mode leaves B untouched (all null). */
  dancers: readonly [StageDancer, StageDancer]
  video: HTMLVideoElement | null
  /** width / height of the frame the landmarks are normalised to, when the video cannot tell. */
  frameAspect: number | null
}

export const emptyDancer = (): StageDancer => ({ pose: null, features: null, control: null, pulse: 0 })

export const emptyScene = (): StageScene => ({
  dancers: [emptyDancer(), emptyDancer()],
  video: null,
  frameAspect: null,
})

/** Empty stage: nothing drawn until the next source delivers its first frame. */
export const clearScene = (scene: StageScene): void => {
  for (const dancer of scene.dancers) {
    dancer.pose = null
    dancer.features = null
    dancer.control = null
    dancer.pulse = 0
  }
  scene.video = null
  scene.frameAspect = null
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Largest `aspect` (w/h) rectangle centred inside width×height — the letterboxed frame. */
export const fitFrame = (width: number, height: number, aspect: number | null): Rect => {
  if (aspect === null || !Number.isFinite(aspect) || aspect <= 0) {
    return { x: 0, y: 0, w: width, h: height }
  }
  const w = Math.min(width, height * aspect)
  const h = w / aspect
  return { x: (width - w) / 2, y: (height - h) / 2, w, h }
}

const videoAspect = (video: HTMLVideoElement | null): number | null =>
  video !== null && video.videoWidth > 0 && video.videoHeight > 0
    ? video.videoWidth / video.videoHeight
    : null

export const PARAM_ORDER: readonly ControlParamId[] = [
  'intensity',
  'brightness',
  'pitch',
  'width',
  'pan',
  'density',
  'space',
]

interface DancerStyle {
  label: string
  skeleton: string
  aura: string
  ring: string
}

/** A = teal skeleton / gold aura (the solo look); B = gold skeleton / red aura. */
const dancerStyles = (palette: StagePalette): readonly [DancerStyle, DancerStyle] => [
  { label: 'A', skeleton: palette.a3, aura: palette.a4, ring: palette.a1 },
  { label: 'B', skeleton: palette.a2, aura: palette.a1, ring: palette.a3 },
]

const drawDancer = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  frame: Rect,
  dancer: StageDancer,
  style: DancerStyle,
  palette: StagePalette,
  labelled: boolean,
): void => {
  const lm = dancer.pose?.landmarks ?? null
  const features = dancer.features
  if (lm === null || features === null) {
    return
  }
  const px = (i: number): [number, number] => {
    const p = lm[i]
    return p === undefined ? [0, 0] : [frame.x + p.x * frame.w, frame.y + p.y * frame.h]
  }

  const hipL = px(LANDMARK.leftHip)
  const hipR = px(LANDMARK.rightHip)
  const centre: [number, number] = [(hipL[0] + hipR[0]) / 2, (hipL[1] + hipR[1]) / 2]
  const radius = Math.max(width, height) * (0.08 + 0.35 * features.energy)
  const aura = ctx.createRadialGradient(centre[0], centre[1], 0, centre[0], centre[1], radius)
  aura.addColorStop(0, style.aura)
  aura.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalAlpha = 0.25 + 0.5 * features.energy
  ctx.fillStyle = aura
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1

  if (dancer.pulse > 0.01) {
    ctx.strokeStyle = style.ring
    ctx.lineWidth = 6 * dancer.pulse
    ctx.globalAlpha = dancer.pulse
    ctx.beginPath()
    ctx.arc(centre[0], centre[1], radius * (1.4 - 0.4 * dancer.pulse), 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = style.skeleton
  ctx.lineWidth = 3 + 5 * features.energy
  for (const [a, b] of POSE_CONNECTIONS) {
    const [ax, ay] = px(a)
    const [bx, by] = px(b)
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  ctx.fillStyle = palette.ink
  for (const i of [LANDMARK.leftWrist, LANDMARK.rightWrist, LANDMARK.nose]) {
    const [x, y] = px(i)
    ctx.beginPath()
    ctx.arc(x, y, 5 + 6 * features.sharpness, 0, Math.PI * 2)
    ctx.fill()
  }

  if (labelled) {
    const [nx, ny] = px(LANDMARK.nose)
    ctx.font = `bold ${Math.round(height * 0.05)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = style.skeleton
    ctx.fillText(style.label, nx, ny - height * 0.06)
  }
}

const drawMeters = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  height: number,
  control: ControlFrame,
  style: DancerStyle,
  palette: StagePalette,
): void => {
  const barW = 10
  const gap = 6
  const barH = Math.min(120, height * 0.3)
  PARAM_ORDER.forEach((id, i) => {
    const v = Math.min(1, Math.max(0, control.params[id]))
    const x = x0 + i * (barW + gap)
    ctx.fillStyle = palette.muted
    ctx.globalAlpha = 0.35
    ctx.fillRect(x, y0 - barH, barW, barH)
    ctx.globalAlpha = 1
    ctx.fillStyle = i % 2 === 0 ? style.skeleton : style.aura
    ctx.fillRect(x, y0 - barH * v, barW, barH * v)
  })
}

export const METER_BLOCK_WIDTH = PARAM_ORDER.length * 16

/**
 * Draws one frame of the stage: video (or a dark void), then each dancer's
 * skeleton and energy "aura" in their own colours (labelled A/B when two are
 * on stage), plus a compact parameter meter per dancer. The video and the
 * landmarks share one letterboxed frame so the skeleton lands on the dancer
 * whatever the clip's aspect. Pure: no state beyond what is passed in, so it
 * can be snapshot-tested with a fake context.
 */
export const drawStage = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: StageScene,
  palette: StagePalette,
): void => {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  const frame = fitFrame(width, height, videoAspect(scene.video) ?? scene.frameAspect)
  if (scene.video !== null && scene.video.readyState >= 2) {
    ctx.globalAlpha = 0.85
    ctx.drawImage(scene.video, frame.x, frame.y, frame.w, frame.h)
    ctx.globalAlpha = 1
  }

  const styles = dancerStyles(palette)
  const duet = scene.dancers[1].pose !== null || scene.dancers[1].control !== null
  scene.dancers.forEach((dancer, i) => {
    const style = styles[i]
    if (style !== undefined) {
      drawDancer(ctx, width, height, frame, dancer, style, palette, duet)
    }
  })

  const y0 = height - 12
  const rightX = width - METER_BLOCK_WIDTH - 12
  const controlA = scene.dancers[0].control
  const controlB = scene.dancers[1].control
  if (controlA !== null) {
    drawMeters(ctx, duet ? 12 : rightX, y0, height, controlA, styles[0], palette)
  }
  if (controlB !== null) {
    drawMeters(ctx, rightX, y0, height, controlB, styles[1], palette)
  }
}
