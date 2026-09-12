export const CAMERA_FACINGS = {
  'facing:user': 'Front camera',
  'facing:environment': 'Back / main camera',
} as const

export type CameraFacingId = keyof typeof CAMERA_FACINGS

export const DEFAULT_CAMERA_ID: CameraFacingId = 'facing:user'

export interface CameraDevice {
  deviceId: string
  label: string
}

const DEVICE_PREFIX = 'device:'

export const cameraIdForDevice = (deviceId: string): string => `${DEVICE_PREFIX}${deviceId}`

const isFacingId = (id: string): id is CameraFacingId => Object.hasOwn(CAMERA_FACINGS, id)

/**
 * Turns a picker value into getUserMedia video constraints. Facing ids are a
 * hint (phones honour them, laptops have one camera anyway); a concrete device
 * id is exact.
 */
export const cameraConstraints = (cameraId: string): MediaTrackConstraints => {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } }
  if (cameraId.startsWith(DEVICE_PREFIX)) {
    return { ...size, deviceId: { exact: cameraId.slice(DEVICE_PREFIX.length) } }
  }
  const facing: CameraFacingId = isFacingId(cameraId) ? cameraId : DEFAULT_CAMERA_ID
  return { ...size, facingMode: facing.slice('facing:'.length) }
}

/**
 * Video inputs the browser is willing to name. Labels are empty until the user
 * has granted camera permission once, so callers refresh after a successful start.
 */
export async function listCameras(
  mediaDevices: Pick<MediaDevices, 'enumerateDevices'> | null = navigator.mediaDevices,
): Promise<CameraDevice[]> {
  if (mediaDevices === null) {
    return []
  }
  const devices = await mediaDevices.enumerateDevices()
  return devices
    .filter((d) => d.kind === 'videoinput' && d.deviceId !== '')
    .map((d, i) => ({ deviceId: d.deviceId, label: d.label === '' ? `Camera ${i + 1}` : d.label }))
}
