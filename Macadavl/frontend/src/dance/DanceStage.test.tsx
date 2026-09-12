import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNullEngine, type DanceAudioEngine } from '../audio/danceEngine'
import { createOscDanceEngine } from '../audio/oscEngine'
import { initialFeatureFrame } from '../features/extractor'
import { MAPPING_IDS, createMapping } from '../mapping/registry'
import type { ControlFrame } from '../mapping/types'
import type * as CameraModule from '../pose/camera'
import { listCameras } from '../pose/camera'
import type { MultiPoseFrame, MultiPoseSource, PoseDetection, PoseFrame, PoseSource } from '../pose/types'
import { createDuetPoseSource, createPoseSource } from '../pose/sources'
import { useDanceStore } from '../store/danceStore'
import { poseFrame, standingPose } from '../test/pose'
import { DanceStage } from './DanceStage'

vi.mock('../pose/sources', () => ({
  createPoseSource: vi.fn<typeof createPoseSource>(),
  createDuetPoseSource: vi.fn<typeof createDuetPoseSource>(),
}))

vi.mock('../audio/engine', () => ({
  createToneDanceEngine: vi.fn<() => never>(),
}))

vi.mock('../audio/oscEngine', () => ({
  createOscDanceEngine: vi.fn<typeof createOscDanceEngine>(),
}))

vi.mock('../pose/camera', async (importOriginal) => ({
  ...(await importOriginal<typeof CameraModule>()),
  listCameras: vi.fn<typeof listCameras>(),
}))

const createPoseSourceMock = vi.mocked(createPoseSource)
const createOscDanceEngineMock = vi.mocked(createOscDanceEngine)
const createDuetPoseSourceMock = vi.mocked(createDuetPoseSource)
const listCamerasMock = vi.mocked(listCameras)

const nullEngine = (): DanceAudioEngine => createNullEngine()

interface ManualSource extends PoseSource {
  emit: (frame: PoseFrame) => void
}

const manualSource = (): ManualSource => {
  let handler: ((frame: PoseFrame) => void) | null = null
  return {
    kind: 'fixture',
    videoElement: null,
    frameAspect: null,
    start: (onFrame) => {
      handler = onFrame
      return Promise.resolve()
    },
    stop: vi.fn<() => void>(),
    emit: (frame) => handler?.(frame),
  }
}

interface ManualDuetSource extends MultiPoseSource {
  emit: (frame: MultiPoseFrame) => void
}

const manualDuetSource = (): ManualDuetSource => {
  let handler: ((frame: MultiPoseFrame) => void) | null = null
  return {
    kind: 'fixture',
    numPoses: 2,
    videoElement: null,
    frameAspect: null,
    start: () => Promise.resolve(),
    startMulti: (onFrame) => {
      handler = onFrame
      return Promise.resolve()
    },
    stop: vi.fn<() => void>(),
    emit: (frame) => handler?.(frame),
  }
}

const person = (x: number, handsUp = 0): PoseDetection => ({
  landmarks: standingPose({ x, handsUp }),
  world: null,
})

describe('DanceStage', () => {
  beforeEach(() => {
    useDanceStore.setState({
      sourceId: 'clip:belly-dance',
      mode: 'solo',
      cameraId: 'facing:user',
      cameraDevices: [],
      mappingId: 'direct-v0',
      engineId: 'tone',
      mappingIdB: 'direct-v0',
      status: 'idle',
      error: null,
      recording: false,
      features: initialFeatureFrame(),
      control: null,
      featuresB: initialFeatureFrame(),
      controlB: null,
      frameCount: 0,
    })
    createPoseSourceMock.mockReset()
    createOscDanceEngineMock.mockReset()
    createDuetPoseSourceMock.mockReset()
    listCamerasMock.mockReset()
    listCamerasMock.mockResolvedValue([])
    // jsdom has no 2D canvas; the stage tolerates a null context.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should render controls, the stage and the readouts in the idle state', () => {
    // GIVEN / WHEN
    render(<DanceStage createEngine={nullEngine} />)
    // THEN
    expect(screen.getByRole('heading', { name: 'Dance Stage' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'source' })).toHaveValue('clip:belly-dance')
    expect(screen.getByRole('combobox', { name: 'mapping' })).toHaveValue('direct-v0')
    expect(screen.getByRole('combobox', { name: 'dancers' })).toHaveValue('solo')
    expect(screen.queryByRole('combobox', { name: 'mapping B' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record' })).toBeDisabled()
    expect(screen.getByLabelText('Dance stage visualisation')).toBeInTheDocument()
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: idle')
  })

  it('should run the pipeline for the selected source and update the readouts per frame', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    useDanceStore.setState({ sourceId: 'fixture:hiphop-whip' })
    render(<DanceStage createEngine={nullEngine} />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
    act(() => {
      source.emit(poseFrame(0))
      source.emit(poseFrame(100, standingPose({ handsUp: 1 })))
    })
    // THEN
    expect(createPoseSourceMock).toHaveBeenCalledWith('fixture:hiphop-whip', 'facing:user')
    expect(await screen.findByText('2 frames')).toBeInTheDocument()
    expect(screen.getByTestId('features')).toHaveAttribute('data-present', 'true')
    expect(Number(screen.getByTestId('feature-handHeight').textContent)).toBeGreaterThan(0)
    expect(screen.getByTestId('control-readout')).toHaveTextContent(/intensity 0\.\d+/)
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record' })).toBeEnabled()
  })

  it('should stop the source and return to the ended state', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    render(<DanceStage createEngine={nullEngine} />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled())
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    // THEN
    expect(source.stop).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: ended')
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled()
  })

  it('should clear the last-event readouts when a new run starts', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    render(<DanceStage createEngine={nullEngine} />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled())
    act(() => {
      source.emit(poseFrame(0))
      source.emit(poseFrame(33, standingPose({ handsUp: 1 })))
      source.emit(poseFrame(66, standingPose({ handsUp: 0 })))
    })
    await waitFor(() => expect(screen.getByTestId('last-event')).not.toHaveTextContent('event: —'))
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled())
    // THEN
    expect(screen.getByTestId('last-event')).toHaveTextContent('event: —')
  })

  it('should surface a source failure as an alert', async () => {
    // GIVEN
    createPoseSourceMock.mockRejectedValue(new Error('camera denied'))
    render(<DanceStage createEngine={nullEngine} />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    // THEN
    expect(await screen.findByRole('alert')).toHaveTextContent('camera denied')
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: error')
  })

  it('should change the source in the store from the select', async () => {
    // GIVEN
    render(<DanceStage createEngine={nullEngine} />)
    // WHEN
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'source' }), 'camera')
    // THEN
    expect(useDanceStore.getState().sourceId).toBe('camera')
  })

  it('should list every registered mapping in the selector and describe the chosen one', async () => {
    // GIVEN
    render(<DanceStage createEngine={nullEngine} />)
    const select = screen.getByRole('combobox', { name: 'mapping' })
    // WHEN
    const options = within(select).getAllByRole('option')
    await userEvent.selectOptions(select, 'kinesphere')
    // THEN
    expect(options.map((o) => o.getAttribute('value'))).toStrictEqual(MAPPING_IDS)
    expect(useDanceStore.getState().mappingId).toBe('kinesphere')
    expect(screen.getByText(/Mapping:/)).toHaveTextContent(createMapping('kinesphere').description)
  })

  it('should switch the running pipeline to a freshly reset mapping without stopping', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    const applied: ControlFrame[] = []
    render(<DanceStage createEngine={() => createNullEngine({ onApply: (frame) => applied.push(frame) })} />)
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
    act(() => {
      source.emit(poseFrame(0))
    })
    const direct = createMapping('direct-v0').map(useDanceStore.getState().features)
    // WHEN
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mapping' }), 'signature')
    act(() => {
      source.emit(poseFrame(100, standingPose({ handsUp: 1 })))
    })
    // THEN
    const expected = createMapping('signature').map(useDanceStore.getState().features)
    expect(applied[0]?.params).toStrictEqual(direct.params)
    expect(applied[1]?.params).toStrictEqual(expected.params)
    expect(applied[1]?.params).not.toStrictEqual(applied[0]?.params)
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running')
    expect(source.stop).not.toHaveBeenCalled()
  })

  it('should offer both engines and only show the bridge hint for SuperCollider', async () => {
    // GIVEN
    render(<DanceStage createEngine={nullEngine} />)
    const select = screen.getByRole('combobox', { name: 'engine' })
    expect(select).toHaveValue('tone')
    expect(screen.queryByText(/tools\/sc-bridge/)).not.toBeInTheDocument()
    // WHEN
    await userEvent.selectOptions(select, 'osc')
    // THEN
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toStrictEqual([
      'Tone.js (built-in)',
      'SuperCollider (local OSC bridge)',
    ])
    expect(useDanceStore.getState().engineId).toBe('osc')
    expect(
      screen.getByText('Run tools/sc-bridge and SuperCollider first — see docs/SUPERCOLLIDER.md'),
    ).toBeInTheDocument()
  })

  it('should create the OSC engine when SuperCollider is selected and no engine is injected', async () => {
    // GIVEN
    createPoseSourceMock.mockResolvedValue(manualSource())
    createOscDanceEngineMock.mockReturnValue(createNullEngine())
    useDanceStore.setState({ engineId: 'osc' })
    render(<DanceStage />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
    // THEN
    expect(createOscDanceEngineMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox', { name: 'engine' })).toBeDisabled()
  })

  it('should surface an unreachable bridge as an error state with a readable alert', async () => {
    // GIVEN
    createPoseSourceMock.mockResolvedValue(manualSource())
    createOscDanceEngineMock.mockReturnValue({
      ...createNullEngine(),
      id: 'osc',
      start: () => Promise.reject(new Error('Could not reach the SuperCollider bridge at ws://localhost:57130')),
    })
    useDanceStore.setState({ engineId: 'osc' })
    render(<DanceStage />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    // THEN
    expect(await screen.findByRole('alert')).toHaveTextContent(/SuperCollider bridge/)
    expect(screen.getByTestId('pipeline-status')).toHaveAttribute('data-state', 'error')
  })

  it('should only offer the camera picker for the camera source', async () => {
    // GIVEN
    render(<DanceStage createEngine={nullEngine} />)
    expect(screen.queryByRole('combobox', { name: 'camera' })).not.toBeInTheDocument()
    // WHEN
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'source' }), 'camera')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'camera' }), 'facing:environment')
    // THEN
    expect(screen.getByRole('combobox', { name: 'camera' })).toHaveValue('facing:environment')
    expect(useDanceStore.getState().cameraId).toBe('facing:environment')
  })

  it('should start the chosen camera and list the named devices once permission is granted', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    listCamerasMock.mockResolvedValue([{ deviceId: 'rear-1', label: 'USB Camera' }])
    useDanceStore.setState({ sourceId: 'camera', cameraId: 'facing:environment' })
    render(<DanceStage createEngine={nullEngine} />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    // THEN
    expect(createPoseSourceMock).toHaveBeenCalledWith('camera', 'facing:environment')
    expect(await screen.findByRole('option', { name: 'USB Camera' })).toHaveValue('device:rear-1')
    expect(screen.getByRole('combobox', { name: 'camera' })).toHaveValue('facing:environment')
  })

  it('should keep the camera running when device enumeration fails', async () => {
    // GIVEN
    const source = manualSource()
    createPoseSourceMock.mockResolvedValue(source)
    listCamerasMock.mockRejectedValue(new Error('enumerateDevices blocked'))
    useDanceStore.setState({ sourceId: 'camera' })
    render(<DanceStage createEngine={nullEngine} />)
    // WHEN
    await userEvent.click(screen.getByRole('button', { name: 'Start' }))
    // THEN
    await waitFor(() => expect(listCamerasMock).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
    expect(useDanceStore.getState().cameraDevices).toStrictEqual([])
  })

  describe('duet mode', () => {
    it('should show a second mapping selector and a readout per dancer once two dancers are chosen', async () => {
      // GIVEN
      render(<DanceStage createEngine={nullEngine} />)
      // WHEN
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'dancers' }), 'duet')
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mapping B' }), 'kinesphere')
      // THEN
      expect(useDanceStore.getState()).toMatchObject({ mode: 'duet', mappingId: 'direct-v0', mappingIdB: 'kinesphere' })
      expect(screen.getByRole('region', { name: 'Dancer A' })).toBeInTheDocument()
      expect(within(screen.getByRole('region', { name: 'Dancer B' })).getByText(/pans the sound/)).toBeInTheDocument()
    })

    it('should run both dancers through their own mapping and engine and fill both readouts', async () => {
      // GIVEN
      const source = manualDuetSource()
      createDuetPoseSourceMock.mockResolvedValue(source)
      useDanceStore.setState({ mode: 'duet', sourceId: 'fixture:hiphop-whip', mappingIdB: 'signature' })
      const applied: Record<string, ControlFrame[]> = { A: [], B: [] }
      render(
        <DanceStage
          createEngine={(voice) => createNullEngine({ onApply: (frame) => applied[voice]?.push(frame) })}
        />,
      )
      // WHEN
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
      act(() => {
        source.emit({ t: 0, poses: [person(0.8, 1), person(0.2, 0)] })
        source.emit({ t: 33, poses: [person(0.8, 1), person(0.2, 0)] })
        source.emit({ t: 100, poses: [person(0.8, 1), person(0.2, 0)] })
      })
      // THEN
      expect(createDuetPoseSourceMock).toHaveBeenCalledWith('fixture:hiphop-whip', 'facing:user')
      expect(createPoseSourceMock).not.toHaveBeenCalled()
      expect(await screen.findByText('3 frames')).toBeInTheDocument()
      expect(screen.getByTestId('features')).toHaveAttribute('data-present', 'true')
      expect(screen.getByTestId('features-b')).toHaveAttribute('data-present', 'true')
      const handsA = Number(screen.getByTestId('feature-handHeight').textContent)
      const handsB = Number(screen.getByTestId('feature-handHeight-b').textContent)
      expect(handsB).toBeGreaterThan(handsA)
      expect(applied['A']).toHaveLength(3)
      expect(applied['B']).toHaveLength(3)
      expect(applied['B']?.[2]?.params).not.toStrictEqual(applied['A']?.[2]?.params)
      expect(screen.getByTestId('control-readout-b')).toHaveTextContent(/intensity 0\.\d+/)
    })

    it('should reset dancer B\'s last event to — once B leaves the frame', async () => {
      // GIVEN
      const source = manualDuetSource()
      createDuetPoseSourceMock.mockResolvedValue(source)
      useDanceStore.setState({ mode: 'duet' })
      render(<DanceStage createEngine={nullEngine} />)
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
      act(() => {
        source.emit({ t: 0, poses: [person(0.2), person(0.8, 0)] })
        source.emit({ t: 33, poses: [person(0.2), person(0.8, 1)] })
        source.emit({ t: 66, poses: [person(0.2), person(0.8, 0)] })
      })
      await waitFor(() => expect(screen.getByTestId('last-event-b')).not.toHaveTextContent('event: —'))
      // WHEN
      act(() => {
        source.emit({ t: 99, poses: [person(0.2)] })
      })
      // THEN
      expect(screen.getByTestId('features-b')).toHaveAttribute('data-present', 'false')
      expect(screen.getByTestId('last-event-b')).toHaveTextContent('event: —')
    })

    it('should switch only dancer B\'s mapping while running', async () => {
      // GIVEN
      const source = manualDuetSource()
      createDuetPoseSourceMock.mockResolvedValue(source)
      useDanceStore.setState({ mode: 'duet' })
      const applied: Record<string, ControlFrame[]> = { A: [], B: [] }
      render(
        <DanceStage
          createEngine={(voice) => createNullEngine({ onApply: (frame) => applied[voice]?.push(frame) })}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      await waitFor(() => expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: running'))
      act(() => {
        source.emit({ t: 0, poses: [person(0.2), person(0.8)] })
      })
      // WHEN
      await userEvent.selectOptions(screen.getByRole('combobox', { name: 'mapping B' }), 'signature')
      act(() => {
        source.emit({ t: 100, poses: [person(0.2, 1), person(0.8, 1)] })
      })
      // THEN
      const state = useDanceStore.getState()
      expect(state).toMatchObject({ mappingId: 'direct-v0', mappingIdB: 'signature' })
      expect(applied['A']?.[1]?.params).toStrictEqual(createMapping('direct-v0').map(state.features).params)
      expect(applied['B']?.[1]?.params).toStrictEqual(createMapping('signature').map(state.featuresB).params)
      expect(source.stop).not.toHaveBeenCalled()
    })

    it('should stop both engines and the duet source', async () => {
      // GIVEN
      const source = manualDuetSource()
      createDuetPoseSourceMock.mockResolvedValue(source)
      useDanceStore.setState({ mode: 'duet' })
      const stopped: string[] = []
      render(
        <DanceStage
          createEngine={(voice) => createNullEngine({ onStop: () => stopped.push(voice) })}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Start' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled())
      // WHEN
      await userEvent.click(screen.getByRole('button', { name: 'Stop' }))
      // THEN
      expect(source.stop).toHaveBeenCalledTimes(1)
      expect(stopped.toSorted()).toStrictEqual(['A', 'B'])
      expect(screen.getByTestId('pipeline-status')).toHaveTextContent('Pipeline: ended')
    })
  })
})
