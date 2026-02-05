import http from 'k6/http'
import { check, group } from 'k6'

import { jsonPatch, headers } from './util.js'

import claim from './seed/claim.js'
import encounter from './seed/encounter.js'
import explanationOfBenefit from './seed/explanation-of-benefit.js'
import location from './seed/location.js'
import medicationRequest from './seed/medication-request.js'
import observation from './seed/observation.js'
import organization from './seed/organization.js'
import patient from './seed/patient.js'
import practitioner from './seed/practitioner.js'


export const options = {
  discardResponseBodies: false,
  scenarios: {
    crud: {
      executor: 'constant-vus',
      vus: __ENV.K6_VUS || 300,
      duration: '5m',
      gracefulStop: '30s',
    },
  },
}

export function setup() {
  return {
    baseUrl: 'http://localhost:8080/fhir',
    params: { headers: headers(), timeout: 120000},
    seeds: {
      claim: JSON.stringify(claim),
      encounter: JSON.stringify(encounter),
      explanationOfBenefit: JSON.stringify(explanationOfBenefit),
      location: JSON.stringify(location),
      medicationRequest: JSON.stringify(medicationRequest),
      observation: JSON.stringify(observation),
      organization: JSON.stringify(organization),
      patient: JSON.stringify(patient),
      practitioner: JSON.stringify(practitioner),
    }
  }
}

const getRtId = (data, rt) => `${data[rt].resourceType}/${data[rt].id}`

const changeResource = (resource, inplace = true) => {
  const change = {}

  switch (resource.resourceType) {
    case 'Encounter':
      change['status'] = resource.status === 'planned' ? 'in-progress' : 'planned'
      break
    case 'Location':
    case 'Organization':
      change['name'] = `${resource.name}-${+(new Date())}`
      break
    case 'MedicationRequest':
      change['status'] = resource.status === 'on-hold' ? 'draft' : 'on-hold'
      break
    case 'Observation':
      change['issued'] = new Date().toISOString()
      break
    case 'Patient':
    case 'Practitioner':
      change['gender'] = resource.gender === 'unknown' ? 'other' : 'unknown'
      break
    default:
      change['created'] = new Date().toISOString()
  }

  return inplace ? Object.assign(resource, change) : change
}

export default function ({ baseUrl, params, seeds }) {
  const resources = {}

  group('create', () => {
    group('Patient', () => {
      const x = http.post(http.url`${baseUrl}/Patient`, seeds.patient, params)
      if (!check(x, { 'Patient created': ({ status }) => status === 201 })) return;
      resources.Patient = x.json()
    })

    group('Location', () => {
      const x = http.post(http.url`${baseUrl}/Location`, seeds.location, params)
      if (!check(x, { 'Location created': ({ status }) => status === 201 })) return;
      resources.Location = x.json()
    })

    group('Organization', () => {
      const x = http.post(http.url`${baseUrl}/Organization`, seeds.organization, params)
      if (!check(x, { 'Organization created': ({ status }) => status === 201 })) return;
      resources.Organization = x.json()
    })

    group('Practitioner', () => {
      const x = http.post(http.url`${baseUrl}/Practitioner`, seeds.practitioner, params)
      if (!check(x, { 'Practitioner created': ({ status }) => status === 201 })) return;
      resources.Practitioner = x.json()
    })

    group('Encounter', () => {
      const payload = JSON.parse(seeds.encounter)
      jsonPatch(payload, 'subject.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'location.0.location.reference', getRtId(resources, 'Location'))
      jsonPatch(payload, 'participant.0.individual.reference', getRtId(resources, 'Practitioner'))
      jsonPatch(payload, 'serviceProvider.reference', getRtId(resources, 'Organization'))
      const x = http.post(http.url`${baseUrl}/Encounter`, JSON.stringify(payload), params)
      if (!check(x, { 'Encounter created': ({ status }) => status === 201 })) return;
      resources.Encounter = x.json()
    })

    group('Observation', () => {
      const payload = JSON.parse(seeds.observation)
      jsonPatch(payload, 'encounter.reference', getRtId(resources, 'Encounter'))
      jsonPatch(payload, 'subject.reference', getRtId(resources, 'Patient'))
      const x = http.post(http.url`${baseUrl}/Observation`, JSON.stringify(payload), params)
      if (!check(x, { 'Observation created': ({ status }) => status === 201 })) return;
      resources.Observation = x.json()
    })

    group('MedicationRequest', () => {
      const payload = JSON.parse(seeds.medicationRequest)
      jsonPatch(payload, 'encounter.reference', getRtId(resources, 'Encounter'))
      jsonPatch(payload, 'requester.reference', getRtId(resources, 'Practitioner'))
      jsonPatch(payload, 'subject.reference', getRtId(resources, 'Patient'))
      const x = http.post(http.url`${baseUrl}/MedicationRequest`, JSON.stringify(payload), params)
      if (!check(x, { 'MedicationRequest created': ({ status }) => status === 201 })) return;
      resources.MedicationRequest = x.json()
    })

    group('Claim', () => {
      const payload = JSON.parse(seeds.claim)
      jsonPatch(payload, 'patient.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'provider.reference', getRtId(resources, 'Organization'))
      jsonPatch(payload, 'prescription.reference', getRtId(resources, 'MedicationRequest'))
      jsonPatch(payload, 'item.0.encounter.0.reference', getRtId(resources, 'Encounter'))
      const x = http.post(http.url`${baseUrl}/Claim`, JSON.stringify(payload), params)
      if (!check(x, { 'Claim created': ({ status }) => status === 201 })) return;
      resources.Claim = x.json()
    })

    group('ExplanationOfBenefit', () => {
      const payload = JSON.parse(seeds.explanationOfBenefit)
      jsonPatch(payload, 'contained.0.subject.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'contained.0.requester.reference', getRtId(resources, 'Practitioner'))
      jsonPatch(payload, 'contained.0.performer.0.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'contained.1.beneficiary.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'patient.reference', getRtId(resources, 'Patient'))
      jsonPatch(payload, 'provider.reference', getRtId(resources, 'Practitioner'))
      jsonPatch(payload, 'claim.reference', getRtId(resources, 'Claim'))
      jsonPatch(payload, 'careTeam.0.provider.reference', getRtId(resources, 'Practitioner'))
      jsonPatch(payload, 'item.0.encounter.0.reference', getRtId(resources, 'Encounter'))
      const x = http.post(http.url`${baseUrl}/ExplanationOfBenefit`, JSON.stringify(payload), params)
      if (!check(x, { 'ExplanationOfBenefit created': ({ status }) => status === 201 })) return;
      resources.ExplanationOfBenefit = x.json()
    })
  })

  group('read', () => {
    Object.keys(resources).forEach(rt => {
      group(rt, () => {
        const x = http.get(
          http.url`${baseUrl}/${getRtId(resources, rt)}`,
          { ...params, responseType: 'none', tags: { name: `${rt}/?` } }
        )
        check(x, { [`${rt} read`]: ({ status }) => status === 200 })
      })
    })
  })

  group('update', () => {
    Object.entries(resources).forEach(([rt, data]) => {
      group(rt, () => {
        changeResource(data)
        const x = http.put(
          http.url`${baseUrl}/${rt}/${data.id}`,
          JSON.stringify(data),
          { ...params, responseType: 'none', tags: { name: `${rt}/?` } }
        )
        check(x, { [`${rt} update`]: ({ status }) => status === 200 })
      })
    })
  })

  group('delete', () => {
    Object.keys(resources).reverse().forEach(rt => {
      group(rt, () => {
        const x = http.del(
          http.url`${baseUrl}/${getRtId(resources, rt)}`,
          null,
          { ...params, responseType: 'none', tags: { name: `${rt}/?` } }
        )
        check(x, { [`${rt} delete`]: ({ status }) => status === 200 })
      })
    })
  })
}
