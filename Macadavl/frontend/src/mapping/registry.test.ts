import { describe, expect, it } from 'vitest'
import { initialFeatureFrame } from '../features/extractor'
import { DEFAULT_MAPPING_ID, MAPPING_IDS, MAPPING_INFOS, createMapping, isMappingId } from './registry'

const EXPECTED_IDS = ['direct-v0', 'kinesphere', 'own-pulse', 'effort-voice', 'mood-rooms', 'signature']

describe('mapping registry', () => {
  it('should expose the baseline plus the five researched strategies, in demo order', () => {
    // GIVEN / WHEN
    const ids = [...MAPPING_IDS]
    // THEN
    expect(ids).toStrictEqual(EXPECTED_IDS)
    expect(DEFAULT_MAPPING_ID).toBe('direct-v0')
  })

  it.each(EXPECTED_IDS)('should build "%s" whose id matches its registry key and produces a valid frame', (id) => {
    // GIVEN
    expect(isMappingId(id)).toBe(true)
    if (!isMappingId(id)) {
      return
    }
    // WHEN
    const mapping = createMapping(id)
    const frame = mapping.map({ ...initialFeatureFrame(), present: true })
    // THEN
    expect(mapping.id).toBe(id)
    expect(mapping.label.length).toBeGreaterThan(0)
    expect(mapping.description.length).toBeGreaterThan(0)
    Object.values(frame.params).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  it('should describe every mapping with a distinct label', () => {
    // GIVEN / WHEN
    const labels = MAPPING_INFOS.map((m) => m.label)
    // THEN
    expect(MAPPING_INFOS.map((m) => m.id)).toStrictEqual(EXPECTED_IDS)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('should reject unknown ids', () => {
    // GIVEN / WHEN / THEN
    expect(isMappingId('nope')).toBe(false)
    expect(isMappingId('toString')).toBe(false)
  })
})
