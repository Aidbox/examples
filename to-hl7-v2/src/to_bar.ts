import { BackboneElement, Bundle, BundleEntry } from '../types/hl7-fhir-r4-core/Bundle'
import { Invoice } from '../types/hl7-fhir-r4-core/Invoice'
import { ContactPoint, Patient } from '../types/hl7-fhir-r4-core/Patient'
import { Coverage } from '../types/hl7-fhir-r4-core/Coverage'
import { Encounter } from '../types/hl7-fhir-r4-core/Encounter'
import { Condition } from '../types/hl7-fhir-r4-core/Condition'
import { Reference } from '../types/hl7-fhir-r4-core/Reference'
import { DomainResource } from '../types/hl7-fhir-r4-core/DomainResource'
import { Resource } from '../types/hl7-fhir-r4-core/Resource'
import { HumanName } from '../types/hl7-fhir-r4-core/HumanName'
import { Location, Organization, Practitioner, PractitionerRole, Procedure } from '../types/hl7-fhir-r4-core'
import { Address } from '../types/hl7-fhir-r4-core/Address'

function find_in_bundle_by_reference<T extends Resource>(bundle: Bundle, reference: Reference<T['resourceType']> | undefined, resourceTypes: string[]): T | undefined {
    if (reference === undefined)
        return undefined
    let [_type, id] = reference.reference!.split('/')
    for (const resource of bundle.entry || []) {
        if (resourceTypes.filter(rt => resource!.resource?.resourceType === rt).length
            && resource!.resource!.id === id)
            return resource!.resource! as T
    }
    return undefined
}

function find_in_bundle_by_type<T extends Resource>(bundle: Bundle, type: string): Array<T> | undefined {
    return (bundle.entry as BundleEntry[])
        .filter((res: BundleEntry) => res.resource?.resourceType as any === type)
        .map((res: BundleEntry) => res.resource) as any
}

function date_to_hl7(date: number | undefined, date_only?: boolean) {
    if (date === undefined)
        return ''
    let formatter = Intl.DateTimeFormat('en-us', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
    // @ts-ignore
    let [{value: month}, _sep1,
        // @ts-ignore
         {value: day}, _sep2,
         // @ts-ignore
         {value: year}, _sep3,
         // @ts-ignore
         {value: hour}, _sep4,
         // @ts-ignore
         {value: minute}, _sep5,
         // @ts-ignore
         {value: second}, ...whatever
    ] = formatter.formatToParts(date)
    if (date_only)
        return `${year}${month}${day}`
    else
        return `${year}${month}${day}${hour}${minute}${second}`
}

function date_from_fhir(date: string | undefined): number | undefined {
    if (date === undefined)
        return undefined
    return Date.parse(date)
}

function repeat_strings(str: string, times: number) {
    let strings = [];
    for (let i = 0; i < times; i++)
        strings.push(str)
    return strings
}

function name_from_fhir (name: HumanName | undefined): Array<string | undefined> | undefined {
    if (name === undefined)
        return undefined
    let given = name?.given?.[0]
    let other_given = name?.given?.slice(1).join(' ')
    let family = name?.family
    let suffix = name?.suffix?.join(' ')
    let prefix = name?.prefix?.join(' ')
    let type: string = 'U'
    switch(name?.use) {
        case 'usual':
            type = 'B'
            break
        case 'official':
            type = 'L'
            break
        case 'temp':
            type = 'U'
            break
        case 'nickname':
            type = 'N'
            break
        case 'anonymous':
            type = 'S'
            break
        case 'old':
            type = 'U'
            break
        case 'maiden':
            type = 'M'
            break
    }
    return [family, given, other_given, suffix, prefix, '', type, ...repeat_strings('', 7)]
}

function gender_from_fhir(gender: string | undefined): string {
    let patient_gender: string = 'U'
    switch (gender) {
        case 'male':
            patient_gender = 'M'
            break
        case 'female':
            patient_gender = 'F'
            break
        case 'other':
            patient_gender = 'O'
            break
        case 'unknown':
            patient_gender = 'U'
            break
        default:
            patient_gender = 'A'
    }
    return patient_gender
}

function patient_class_from_fhir(code: string | undefined): string {
    switch(code){
        case 'IMP':
            return 'I'
        case 'EMER':
            return 'E'
        case 'PRENC':
            return 'P'
        case 'HH':
            return 'O'
        default:
            return 'U'
    }
}

// NOTE: This is a heavily opinionated mapping:
// unit -> Nursing unit
// hospital -> Clinic
// lab -> Department
var location_types_from_fhir: Record<string,string> = {
    'DX': 'N',
    'CVDX': 'N',
    'CATH': 'D',
    'ECHO': 'D',
    'GIDX': 'D',
    'ENDOS': 'D',
    'RADDX': 'N',
    'RADO': 'N',
    'RNEU': 'N',
    'HOSP': 'C',
    'CHR': 'C',
    'GACH': 'C',
    'MHSP': 'C',
    'PSYCHF': 'C',
    'RH': 'C',
    'RHAT': 'C',
    'RHII': 'C',
    'RHMAD': 'C',
    'RHPI': 'C',
    'RHPIH': 'C',
    'RHPIMS': 'C',
    'RHPIVS': 'C',
    'RHYAD': 'C',
    'HU': 'N',
    'BMTU': 'N',
    'CCU': 'N',
    'CHEST': 'N',
    'EPIL': 'N',
    'ER': 'D',
    'ETU': 'N',
    'HD': 'N',
    'HLAB': 'D',
    'INLAB': 'D',
    'OUTLAB': 'D',
    'HRAD': 'N',
    'HUSCS': 'D',
    'ICU': 'N',
    'PEDICU': 'N',
    'PEDNICU': 'N',
    'INPHARM': 'D',
    'MBL': 'D',
    'NCCS': 'N',
    'NS': 'N',
    'OUTPHARM': 'D',
    'PEDU': 'N',
    'PHU': 'N',
    'RHU': 'N',
    'SLEEP': 'N',
    'NCCF': 'D',
    'SNF': 'D',
    'OF': 'D',
    'ALL': 'C',
    'AMPUT': 'C',
    'BMTC': 'C',
    'BREAST': 'C',
    'CANC': 'C',
    'CAPC': 'C',
    'CARD': 'C',
    'PEDCARD': 'C',
    'COAG': 'C',
    'CRS': 'C',
    'DERM': 'C',
    'ENDO': 'C',
    'PEDE': 'C',
    'ENT': 'C',
    'FMC': 'C',
    'GI': 'C',
    'PEDGI': 'C',
    'GIM': 'C',
    'GYN': 'C',
    'HEM': 'C',
    'PEDHEM	': 'C',
    'HTN': 'C',
    'IEC': 'C',
    'INFD': 'C',
    'PEDID': 'C',
    'INV': 'C',
    'LYMPH': 'C',
    'MGEN': 'C',
    'NEPH': 'C',
    'PEDNEPH': 'C',
    'NEUR': 'C',
    'OB': 'C',
    'OMS': 'C',
    'ONCL': 'C',
    'PEDHO': 'C',
    'OPH': 'C',
    'OPTC': 'C',
    'ORTHO': 'C',
    'HAND': 'C',
    'PAINCL': 'C',
    'PC': 'C',
    'PEDC': 'C',
    'PEDRHEUM': 'C',
    'POD': 'C',
    'PREV': 'C',
    'PROCTO': 'C',
    'PROFF': 'O',
    'PROS': 'C',
    'PSI': 'C',
    'PSY': 'C',
    'RHEUM': 'C',
    'SPMED': 'C',
    'SU': 'C',
    'PLS': 'C',
    'URO': 'C',
    'TR': 'C',
    'TRAVEL': 'C',
    'WND': 'C',
    'RTF': 'D',
    'PRC': 'C',
    'SURF': 'D',
    'PTRES': 'H'
}

function location_from_fhir(location: Location | undefined): Array<string> | undefined {
    if (location == undefined)
        return undefined
    return ['', '', '', '', '',
        // FIXME: This ! is a lie to silent the TypeScript compiler
        (location_types_from_fhir[location?.type?.[0]?.coding?.[0]?.code!] || 'D'),
        ...repeat_strings('', 5)
    ]
}

var admission_types_from_fhir: Record<string, string> = {
        'EL': 'C',
        'EM': 'C',
        'R': 'R',
        'A': 'U',
        'S': 'U',
        'UR': 'U'
}

function admission_type_from_fhir(code: string | undefined): string {
    if (code === undefined)
        return ''
    return (admission_types_from_fhir[code] || '')
}

function find_encounter_practitioner(bundle: Bundle, encounter: Encounter | undefined): Practitioner | undefined {
    if (encounter === undefined)
        return undefined
    for (const participant of encounter.participant || []) {
        let individual = find_in_bundle_by_reference(bundle, participant.individual, ['Practitioner', 'PractitionerRole'])
        if (individual?.resourceType === 'Practitioner') {
            return individual as Practitioner
        } else if (individual?.resourceType === 'PractitionerRole') {
            let prac = find_in_bundle_by_reference(bundle, (individual as PractitionerRole).practitioner, ['Practitioner']) as Practitioner | undefined
            if (prac)
                return prac
        }
    }
    return undefined
}

function composite_name_from_fhir(practitioner: Practitioner | undefined): Array<string | undefined> | undefined {
    if (practitioner === undefined)
        return undefined
    let [family, given, other_given, suffix, prefix, _, type] = name_from_fhir(practitioner.name?.[0]) || []
    return [practitioner?.identifier?.[0]?.value, family, given, other_given, suffix, prefix,
            '', '',
            // TODO: Process qualification.issuer into authority?
            '',
            type,
            // TODO: More bindings (which ones?)
            ...repeat_strings('', 13)
    ]
}

var diagnosis_types_from_fhir: Record<string,string> = {
    'unconfirmed': 'W',
    'provisional': 'W',
    'differential': 'W',
    'confirmed': 'F',
    // FIXME: These two are suspicious, but 0052 only has A/W/F
    'refuted': 'F',
    'entered-in-error': 'F'
}

function diagnosis_type_from_fhir(code: string | undefined): string | undefined {
    if (code === undefined)
        return undefined
    return diagnosis_types_from_fhir[code];

}

var diagnosis_action_codes_from_fhir: Record<string,string> = {
    'unconfirmed': 'A',
    'provisional': 'A',
    'differential': 'A',
    'confirmed': 'A',
    'refuted': 'D',
    'entered-in-error': 'D'
}

function diagnosis_action_code_from_fhir(code: string | undefined): string | undefined {
    if (code === undefined)
        return undefined
    return diagnosis_action_codes_from_fhir[code]
}

var procedure_types_from_fhir: Record<string,string> = {
    '103693007': 'D'
}

function procedure_type_from_fhir(code: string | undefined): string {
    if (code === undefined)
        return ''
    return procedure_types_from_fhir[code] || 'P'
}

function find_procedure_practitioner(bundle: Bundle, procedure: Procedure | undefined): Practitioner | undefined {
    if (procedure === undefined)
        return undefined
    for (const participant of procedure.performer || []) {
        let actor = find_in_bundle_by_reference(bundle, participant.actor, ['Practitioner', 'PractitionerRole'])
        if (actor?.resourceType === 'Practitioner') {
            return actor as Practitioner
        } else if (actor?.resourceType === 'PractitionerRole') {
            let prac = find_in_bundle_by_reference(bundle, (actor as PractitionerRole).practitioner, ['Practitioner']) as Practitioner | undefined
            if (prac)
                return prac
        }
    }
    return undefined
}

var procedure_actions_from_fhir: Record<string,string> = {
    'entered-in-error': 'D',
    'stopped': 'D'
}

function composite_org_name_from_fhir(org: Organization | undefined): Array<string | undefined> | undefined {
    if (org === undefined)
        return undefined
    return [org?.name,
        'L', // Is there a better type code for organization names?
        ...repeat_strings('', 7),
        org?.identifier?.[0]?.id
    ]
}

var addr_uses_from_fhir: Record<string,string> = {
    'home': 'H',
    'work': 'O',
    'temp': 'C',
    'old': 'BA',
    'billing': 'L'
}

function extended_address_from_fhir(addr: Address | undefined): Array<string | undefined> | undefined {
    if (addr === undefined)
        return undefined
    return [addr.line?.[0], '',
        addr.city,
        addr.state,
        addr.postalCode,
        addr.country,
        addr.use ? addr_uses_from_fhir[addr.use] : '',
        '', '', '', '', '',
        date_to_hl7(date_from_fhir(addr.period?.start)),
        date_to_hl7(date_from_fhir(addr.period?.end))
    ]
}

var telecom_uses_from_fhir: Record<string,string> = {
    'home': 'PRN',
    'work': 'WPN',
    'temp': 'ORN'
}

var telecom_equipment_from_fhir: Record<string,string> = {
    'home': 'PH',
    'work': 'PH',
    'temp': 'PH',
    'old': 'PH',
    'mobile': 'CP'
}

function telecommunication_from_fhir(cps: ContactPoint[] | undefined): Array<string | undefined> | undefined {
    if (cps === undefined)
        return undefined
    let typed: Record<string,ContactPoint> = {}
    for (const cp of cps)
        typed[cp.system!] = cp
    return [typed['phone']?.value,
        telecom_uses_from_fhir[typed['phone']?.use!],
        telecom_equipment_from_fhir[typed['phone']?.use!],
        typed['email']?.value,
        ...repeat_strings('', 7),
        typed['phone']?.value
    ]
}

export function to_BAR(invoice: Invoice, bundle: Bundle) {
    let patient = find_in_bundle_by_reference(bundle, invoice!.subject as Reference<'Patient'>, ['Patient']) as Patient | undefined
    let coverage = find_in_bundle_by_type(bundle, 'Coverage')?.[0] as Coverage | undefined
    let encounter = find_in_bundle_by_type(bundle, 'Encounter')?.[0] as Encounter | undefined
    let conditions = find_in_bundle_by_type(bundle, 'Condition') as Condition[] | undefined
    let procedures = find_in_bundle_by_type(bundle, 'Procedure') as Procedure[] | undefined
    let insurer = find_in_bundle_by_reference(bundle, coverage?.policyHolder as Reference<'Organization'>, ['Organization']) as Organization | undefined
    let insurer_contact = undefined
    if (insurer && insurer.contact && insurer.contact.filter(x => x.purpose?.coding?.[0]?.code === 'PAYOR'))
        insurer_contact = insurer.contact.filter(x => x.purpose?.coding?.[0]?.code === 'PAYOR')[0]
    let date_string = date_to_hl7(Date.now())
    let patient_class = patient_class_from_fhir(encounter?.class.code)
    let encounter_location = find_in_bundle_by_reference(bundle, encounter?.location?.[0]?.location as Reference<'Location'>, ['Location']) as Location | undefined
    let encounter_practitioner = find_encounter_practitioner(bundle, encounter)
    let inpatient_class = encounter?.classHistory?.filter((c) => c.class.code === 'IMP')[0]
    let inpatient_period = inpatient_class?.period
    // TODO: 'DotBase', 'CSP', '050^00001', 'P', and '2.5' should be configurable
    let BAR: Array<Array<string | undefined | Array<string | undefined>>>
    = [['MSH', '^~\\&', 'DotBase', 'DotBase', 'CSP', '050^0001', date_string, '', 'BAR^P12', 'TODO', 'P', '2.5', '', '', 'AL'],
       ['EVN', 'P12', date_string, ''],
       ['PID', '', '',
        patient?.id!,
        '',
        name_from_fhir(patient?.name?.[0]),
        '',
        date_to_hl7(date_from_fhir(patient?.birthDate), true) || '',
        // TODO other fields: https://hl7-definition.caristix.com/v2/HL7v2.5.1/Segments/PID
        gender_from_fhir(patient?.gender),
        ...repeat_strings('', 31)],
       ['PV1', '',
        patient_class,
        location_from_fhir(encounter_location),
        admission_type_from_fhir(encounter?.priority?.coding?.[0]?.code),
        '',
        // TODO: Prior location (also location_from_fhir call with status awareness)
        '',
        composite_name_from_fhir(encounter_practitioner),
        // TODO: Referring and consulting doctor
        '', '',
        'MED',
        '',
        // Indicators
        '', '',
        // Admit source, ambulatory status, VIP
        '', '', '',
        // Admitting doctor, same as attending for now
        composite_name_from_fhir(encounter_practitioner),
        '', encounter?.identifier?.[0]?.value, // Visit number
        '', '', '', '',
        // Contract
        '', date_to_hl7(date_from_fhir(invoice.date), true), invoice.totalGross?.value?.toString(), '',
        ... repeat_strings('', 16),
        // Dates: admission and discharge
        date_to_hl7(date_from_fhir(inpatient_period?.start)),
        date_to_hl7(date_from_fhir(inpatient_period?.end)),
        ...repeat_strings('', 7)
        ],
        ...(conditions as Condition[]).map((condition: Condition) => {
                return ['DG1',
                        conditions!.length.toString(),
                        // TODO: Diagnosis coding method, code, and description
                        '', '', '',
                        date_string,
                        diagnosis_type_from_fhir(condition.verificationStatus?.coding?.[0]?.code),
                        ...repeat_strings('', 8),
                        // DG1.15 is Priority according to the spec, but DotBase use it as Related Diagnose
                        '',
                        '', '', '',
                        // DG1.19 is Attestation date, but DotBase use it as Procedure ID
                        // Opting for date here, because Procedures might not be available here
                        date_string,
                        '',
                        diagnosis_action_code_from_fhir(condition.verificationStatus?.coding?.[0]?.code)
                ]}),
        ...(procedures as Procedure[]).map((procedure: Procedure) => {
            let practitioner = find_procedure_practitioner(bundle, procedure)
            return ['PR1',
                    procedures!.length.toString(),
                    // Coding method, code, and description
                    '', '', '',
                    // Procedure date
                    date_string,
                    procedure_type_from_fhir(procedure.category?.coding?.[0]?.code),
                    '', '', '', '',
                    // Standard says PR1.11 is a surgeon, but DotBase use PR1.11 for their own field
                    'BAPIDOTBASE^^^MRD-MRN',
                    composite_name_from_fhir(practitioner),
                    ...repeat_strings('', 6),
                    procedure.identifier?.[0]?.value,
                    procedure_actions_from_fhir[procedure.status] || 'A'
            ]
        }),
        ...(!coverage
            ? []
            : [['IN1',
                coverage?.identifier?.[0]?.id,
                insurer?.identifier?.[0]?.id,
                composite_org_name_from_fhir(insurer),
                extended_address_from_fhir(insurer?.address?.[0]),
                name_from_fhir(insurer_contact?.name),
                // TODO: Might need to preprocess this to an HL7-friendly format
                // But the requirements are pretty relaxed in HL7
                telecommunication_from_fhir(insurer_contact?.telecom),
                // TODO: Get group IDs from somewhere
                '', '', '', '',
                date_to_hl7(date_from_fhir(coverage.period?.start)),
                date_to_hl7(date_from_fhir(coverage.period?.end)),
                '', '',
                name_from_fhir(patient?.name?.[0]),
                'SEL',
                date_to_hl7(date_from_fhir(patient?.birthDate)),
                extended_address_from_fhir(patient?.address?.[0]),
                
            ]])
       ]
       return BAR
}