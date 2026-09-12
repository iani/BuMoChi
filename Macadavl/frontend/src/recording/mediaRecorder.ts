/**
 * Records the stage canvas plus the engine's audio stream into a single WebM.
 * Returns null when the browser lacks MediaRecorder (e.g. headless test runs).
 */
export interface StageRecording {
  stop: () => Promise<Blob>
}

export const startStageRecording = (
  canvas: HTMLCanvasElement,
  audio: MediaStream | null,
  fps = 30,
): StageRecording | null => {
  if (typeof MediaRecorder === 'undefined') {
    return null
  }
  const stream = canvas.captureStream(fps)
  if (audio !== null) {
    for (const track of audio.getAudioTracks()) {
      stream.addTrack(track)
    }
  }
  const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find((type) =>
    MediaRecorder.isTypeSupported(type),
  )
  const recorder =
    mimeType === undefined ? new MediaRecorder(stream) : new MediaRecorder(stream, { mimeType })
  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  })
  recorder.start(250)
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.addEventListener(
          'stop',
          () => resolve(new Blob(chunks, { type: recorder.mimeType })),
          { once: true },
        )
        recorder.stop()
      }),
  }
}

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
