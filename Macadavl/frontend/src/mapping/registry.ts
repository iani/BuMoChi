import { createDirectMapping } from './directMapping'
import { createEffortMapping } from './effortMapping'
import { createKinesphereMapping } from './kinesphereMapping'
import { createMoodMapping } from './moodMapping'
import { createPulseMapping } from './pulseMapping'
import { createSignatureMapping } from './signatureMapping'
import type { Mapping } from './types'

export const MAPPING_FACTORIES = {
  'direct-v0': createDirectMapping,
  kinesphere: createKinesphereMapping,
  'own-pulse': createPulseMapping,
  'effort-voice': createEffortMapping,
  'mood-rooms': createMoodMapping,
  signature: createSignatureMapping,
} as const

export type MappingId = keyof typeof MAPPING_FACTORIES

export const MAPPING_IDS = Object.keys(MAPPING_FACTORIES).filter(isMappingId)

export const DEFAULT_MAPPING_ID: MappingId = 'direct-v0'

export function isMappingId(value: string): value is MappingId {
  return Object.hasOwn(MAPPING_FACTORIES, value)
}

export const createMapping = (id: MappingId): Mapping => MAPPING_FACTORIES[id]()

export interface MappingInfo {
  id: MappingId
  label: string
  description: string
}

export const MAPPING_INFOS: readonly MappingInfo[] = MAPPING_IDS.map((id) => {
  const { label, description } = createMapping(id)
  return { id, label, description }
})
