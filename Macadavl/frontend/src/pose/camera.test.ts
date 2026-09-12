import { describe, expect, it } from 'vitest'
import { cameraConstraints, cameraIdForDevice, listCameras } from './camera'

describe('cameraConstraints', () => {
  it.each([
    ['facing:user', 'user'],
    ['facing:environment', 'environment'],
    ['nonsense', 'user'],
  ])('should map %s to facingMode %s', (id, facingMode) => {
    // WHEN
    const constraints = cameraConstraints(id)
    // THEN
    expect(constraints.facingMode).toBe(facingMode)
    expect(constraints.deviceId).toBeUndefined()
    expect(constraints.width).toStrictEqual({ ideal: 1280 })
  })

  it('should pin an exact deviceId for a picked device', () => {
    // WHEN
    const constraints = cameraConstraints(cameraIdForDevice('abc123'))
    // THEN
    expect(constraints.deviceId).toStrictEqual({ exact: 'abc123' })
    expect(constraints.facingMode).toBeUndefined()
  })
})

const deviceInfo = (kind: MediaDeviceKind, deviceId: string, label: string): MediaDeviceInfo => ({
  kind,
  deviceId,
  label,
  groupId: 'g',
  toJSON: () => ({ kind, deviceId, label }),
})

describe('listCameras', () => {
  it('should keep only named video inputs and label unnamed ones by position', async () => {
    // GIVEN
    const mediaDevices = {
      enumerateDevices: () =>
        Promise.resolve([
          deviceInfo('audioinput', 'mic', 'Mic'),
          deviceInfo('videoinput', 'front', 'FaceTime HD'),
          deviceInfo('videoinput', 'back', ''),
          deviceInfo('videoinput', '', ''),
        ]),
    }
    // WHEN
    const cameras = await listCameras(mediaDevices)
    // THEN
    expect(cameras).toStrictEqual([
      { deviceId: 'front', label: 'FaceTime HD' },
      { deviceId: 'back', label: 'Camera 2' },
    ])
  })

  it('should return no cameras when mediaDevices is unavailable', async () => {
    // WHEN / THEN
    await expect(listCameras(null)).resolves.toStrictEqual([])
  })
})
