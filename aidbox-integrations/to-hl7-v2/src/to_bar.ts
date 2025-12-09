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

function findInBundleByReference<T extends Resource>(bundle: Bundle, reference: Reference<T['resourceType']> | undefined, resourceTypes: string[]): T | undefined {
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

function findInBundleByType<T extends Resource>(bundle: Bundle, type: string): Array<T> | undefined {
    return (bundle.entry as BundleEntry[])
        .filter((res: BundleEntry) => res.resource?.resourceType as any === type)
        .map((res: BundleEntry) => res.resource) as any
}

function dateToHL7(date: number | undefined, date_only?: boolean) {
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

function dateFromFHIR(date: string | undefined): number | undefined {
    if (date === undefined)
        return undefined
    return Date.parse(date)
}

function repeatStrings(str: string, times: number) {
    let strings = [];
    for (let i = 0; i < times; i++)
        strings.push(str)
    return strings
}

function nameFromFHIR (name: HumanName | undefined): Array<string | undefined> | undefined {
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
    return [family, given, other_given, suffix, prefix, '', type, ...repeatStrings('', 7)]
}

function genderFromFHIR(gender: string | undefined): string {
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

function patientClassFromFHIR(code: string | undefined): string {
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
var locationTypesFromFHIR: Record<string,string> = {
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

function locationFromFHIR(location: Location | undefined): Array<string> | undefined {
    if (location == undefined)
        return undefined
    return ['', '', '', '', '',
        // FIXME: This ! is a lie to silent the TypeScript compiler
        (locationTypesFromFHIR[location?.type?.[0]?.coding?.[0]?.code!] || 'D'),
        ...repeatStrings('', 5)
    ]
}

var admissionTypesFromFHIR: Record<string, string> = {
        'EL': 'C',
        'EM': 'C',
        'R': 'R',
        'A': 'U',
        'S': 'U',
        'UR': 'U'
}

function admissionTypeFromFHIR(code: string | undefined): string {
    if (code === undefined)
        return ''
    return (admissionTypesFromFHIR[code] || '')
}

function findEncounterPractitioner(bundle: Bundle, encounter: Encounter | undefined): Practitioner | undefined {
    if (encounter === undefined)
        return undefined
    for (const participant of encounter.participant || []) {
        let individual = findInBundleByReference(bundle, participant.individual, ['Practitioner', 'PractitionerRole'])
        if (individual?.resourceType === 'Practitioner') {
            return individual as Practitioner
        } else if (individual?.resourceType === 'PractitionerRole') {
            let prac = findInBundleByReference(bundle, (individual as PractitionerRole).practitioner, ['Practitioner']) as Practitioner | undefined
            if (prac)
                return prac
        }
    }
    return undefined
}

function compositeNameFromFHIR(practitioner: Practitioner | undefined): Array<string | undefined> | undefined {
    if (practitioner === undefined)
        return undefined
    let [family, given, other_given, suffix, prefix, _, type] = nameFromFHIR(practitioner.name?.[0]) || []
    return [practitioner?.identifier?.[0]?.value, family, given, other_given, suffix, prefix,
            '', '',
            // TODO: Process qualification.issuer into authority?
            '',
            type,
            // TODO: More bindings (which ones?)
            ...repeatStrings('', 13)
    ]
}

var diagnosisTypesFromFHIR: Record<string,string> = {
    'unconfirmed': 'W',
    'provisional': 'W',
    'differential': 'W',
    'confirmed': 'F',
    // FIXME: These two are suspicious, but 0052 only has A/W/F
    'refuted': 'F',
    'entered-in-error': 'F'
}

function diagnosisTypeFromFHIR(code: string | undefined): string | undefined {
    if (code === undefined)
        return undefined
    return diagnosisTypesFromFHIR[code];

}

var diagnosisActionCodesFromFHIR: Record<string,string> = {
    'unconfirmed': 'A',
    'provisional': 'A',
    'differential': 'A',
    'confirmed': 'A',
    'refuted': 'D',
    'entered-in-error': 'D'
}

function diagnosisActionCodeFromFHIR(code: string | undefined): string | undefined {
    if (code === undefined)
        return undefined
    return diagnosisActionCodesFromFHIR[code]
}

var procedureTypesFromFHIR: Record<string,string> = {
    '103693007': 'D'
}

function procedureTypeFromFHIR(code: string | undefined): string {
    if (code === undefined)
        return ''
    return procedureTypesFromFHIR[code] || 'P'
}

function findProcedurePractitioner(bundle: Bundle, procedure: Procedure | undefined): Practitioner | undefined {
    if (procedure === undefined)
        return undefined
    for (const participant of procedure.performer || []) {
        let actor = findInBundleByReference(bundle, participant.actor, ['Practitioner', 'PractitionerRole'])
        if (actor?.resourceType === 'Practitioner') {
            return actor as Practitioner
        } else if (actor?.resourceType === 'PractitionerRole') {
            let prac = findInBundleByReference(bundle, (actor as PractitionerRole).practitioner, ['Practitioner']) as Practitioner | undefined
            if (prac)
                return prac
        }
    }
    return undefined
}

var procedureActionsFromFHIR: Record<string,string> = {
    'entered-in-error': 'D',
    'stopped': 'D'
}

function compositeOrgNameFromFHIR(org: Organization | undefined): Array<string | undefined> | undefined {
    if (org === undefined)
        return undefined
    return [org?.name,
        'L', // Is there a better type code for organization names?
        ...repeatStrings('', 7),
        org?.identifier?.[0]?.id
    ]
}

var addrUsesFromFHIR: Record<string,string> = {
    'home': 'H',
    'work': 'O',
    'temp': 'C',
    'old': 'BA',
    'billing': 'L'
}

function extendedAddressFromFHIR(addr: Address | undefined): Array<string | undefined> | undefined {
    if (addr === undefined)
        return undefined
    return [addr.line?.[0], '',
        addr.city,
        addr.state,
        addr.postalCode,
        addr.country,
        addr.use ? addrUsesFromFHIR[addr.use] : '',
        '', '', '', '', '',
        dateToHL7(dateFromFHIR(addr.period?.start)),
        dateToHL7(dateFromFHIR(addr.period?.end))
    ]
}

var telecomUsesFromFHIR: Record<string,string> = {
    'home': 'PRN',
    'work': 'WPN',
    'temp': 'ORN'
}

var telecomEquipmentFromFHIR: Record<string,string> = {
    'home': 'PH',
    'work': 'PH',
    'temp': 'PH',
    'old': 'PH',
    'mobile': 'CP'
}

function telecommunicationFromFHIR(cps: ContactPoint[] | undefined): Array<string | undefined> | undefined {
    if (cps === undefined)
        return undefined
    let typed: Record<string,ContactPoint> = {}
    for (const cp of cps)
        typed[cp.system!] = cp
    return [typed['phone']?.value,
        telecomUsesFromFHIR[typed['phone']?.use!],
        telecomEquipmentFromFHIR[typed['phone']?.use!],
        typed['email']?.value,
        ...repeatStrings('', 7),
        typed['phone']?.value
    ]
}

export function toBAR(invoice: Invoice, bundle: Bundle) {
    let patient = findInBundleByReference(bundle, invoice!.subject as Reference<'Patient'>, ['Patient']) as Patient | undefined
    let coverage = findInBundleByType(bundle, 'Coverage')?.[0] as Coverage | undefined
    let encounter = findInBundleByType(bundle, 'Encounter')?.[0] as Encounter | undefined
    let conditions = findInBundleByType(bundle, 'Condition') as Condition[] | undefined
    let procedures = findInBundleByType(bundle, 'Procedure') as Procedure[] | undefined
    let insurer = findInBundleByReference(bundle, coverage?.policyHolder as Reference<'Organization'>, ['Organization']) as Organization | undefined
    let insurer_contact = undefined
    if (insurer && insurer.contact && insurer.contact.filter(x => x.purpose?.coding?.[0]?.code === 'PAYOR'))
        insurer_contact = insurer.contact.filter(x => x.purpose?.coding?.[0]?.code === 'PAYOR')[0]
    let date_string = dateToHL7(Date.now())
    let patient_class = patientClassFromFHIR(encounter?.class.code)
    let encounter_location = findInBundleByReference(bundle, encounter?.location?.[0]?.location as Reference<'Location'>, ['Location']) as Location | undefined
    let encounter_practitioner = findEncounterPractitioner(bundle, encounter)
    let inpatient_class = encounter?.classHistory?.filter((c) => c.class.code === 'IMP')[0]
    let inpatient_period = inpatient_class?.period
    // TODO: 'DotBase', 'CSP', '050^00001', 'P', and '2.5' should be configurable
    let BAR: Array<Array<string | undefined | Array<string | undefined>>>
    = [['MSH', '^~\\&', 'DotBase', 'DotBase', 'CSP', '050^0001', date_string, '', 'BAR^P12', 'TODO', 'P', '2.5', '', '', 'AL'],
       ['EVN', 'P12', date_string, ''],
       ['PID', '', '',
        patient?.id!,
        '',
        nameFromFHIR(patient?.name?.[0]),
        '',
        dateToHL7(dateFromFHIR(patient?.birthDate), true) || '',
        // TODO other fields: https://hl7-definition.caristix.com/v2/HL7v2.5.1/Segments/PID
        genderFromFHIR(patient?.gender),
        ...repeatStrings('', 31)],
       ['PV1', '',
        patient_class,
        locationFromFHIR(encounter_location),
        admissionTypeFromFHIR(encounter?.priority?.coding?.[0]?.code),
        '',
        // TODO: Prior location (also location_fromFHIR call with status awareness)
        '',
        compositeNameFromFHIR(encounter_practitioner),
        // TODO: Referring and consulting doctor
        '', '',
        'MED',
        '',
        // Indicators
        '', '',
        // Admit source, ambulatory status, VIP
        '', '', '',
        // Admitting doctor, same as attending for now
        compositeNameFromFHIR(encounter_practitioner),
        '', encounter?.identifier?.[0]?.value, // Visit number
        '', '', '', '',
        // Contract
        '', dateToHL7(dateFromFHIR(invoice.date), true), invoice.totalGross?.value?.toString(), '',
        ... repeatStrings('', 16),
        // Dates: admission and discharge
        dateToHL7(dateFromFHIR(inpatient_period?.start)),
        dateToHL7(dateFromFHIR(inpatient_period?.end)),
        ...repeatStrings('', 7)
        ],
        ...(conditions as Condition[]).map((condition: Condition) => {
                return ['DG1',
                        conditions!.length.toString(),
                        // TODO: Diagnosis coding method, code, and description
                        '', '', '',
                        date_string,
                        diagnosisTypeFromFHIR(condition.verificationStatus?.coding?.[0]?.code),
                        ...repeatStrings('', 8),
                        // DG1.15 is Priority according to the spec, but DotBase use it as Related Diagnose
                        '',
                        '', '', '',
                        // DG1.19 is Attestation date, but DotBase use it as Procedure ID
                        // Opting for date here, because Procedures might not be available here
                        date_string,
                        '',
                        diagnosisActionCodeFromFHIR(condition.verificationStatus?.coding?.[0]?.code)
                ]}),
        ...(procedures as Procedure[]).map((procedure: Procedure) => {
            let practitioner = findProcedurePractitioner(bundle, procedure)
            return ['PR1',
                    procedures!.length.toString(),
                    // Coding method, code, and description
                    '', '', '',
                    // Procedure date
                    date_string,
                    procedureTypeFromFHIR(procedure.category?.coding?.[0]?.code),
                    '', '', '', '',
                    // Standard says PR1.11 is a surgeon, but DotBase use PR1.11 for their own field
                    'BAPIDOTBASE^^^MRD-MRN',
                    compositeNameFromFHIR(practitioner),
                    ...repeatStrings('', 6),
                    procedure.identifier?.[0]?.value,
                    procedureActionsFromFHIR[procedure.status] || 'A'
            ]
        }),
        ...(!coverage
            ? []
            : [['IN1',
                coverage?.identifier?.[0]?.id,
                insurer?.identifier?.[0]?.id,
                compositeOrgNameFromFHIR(insurer),
                extendedAddressFromFHIR(insurer?.address?.[0]),
                nameFromFHIR(insurer_contact?.name),
                // TODO: Might need to preprocess this to an HL7-friendly format
                // But the requirements are pretty relaxed in HL7
                telecommunicationFromFHIR(insurer_contact?.telecom),
                // TODO: Get group IDs from somewhere
                '', '', '', '',
                dateToHL7(dateFromFHIR(coverage.period?.start)),
                dateToHL7(dateFromFHIR(coverage.period?.end)),
                '', '',
                nameFromFHIR(patient?.name?.[0]),
                'SEL',
                dateToHL7(dateFromFHIR(patient?.birthDate)),
                extendedAddressFromFHIR(patient?.address?.[0]),
                '', '', '', // Coordination and Assignment of Benefits
                dateToHL7(dateFromFHIR(invoice.date)),
                // Verification By..Insured's Employment Status
                ...repeatStrings('', 13),
                // TODO: There's only gender in FHIR, so this mapping is imperfect
                genderFromFHIR(patient?.gender),
                //  Insured's Employer's Address.. Insured's Employer's Address
                '', '', '',
                // TODO: Coverage Type must be inferrable from Invoice/Coverage, but it's not obvious
                '',
                '', // Handicap
                // TODO: Insured's ID Number should be fetchable from Patient
                '',
                ...repeatStrings('', 4)
            ]])
       ]
       return BAR
}

export function stringifyMessage(message: Array<Array<string | undefined | Array<string | undefined>>>): string {
    return message.map(segment => {
        return segment.map(field => {
            if (Array.isArray(field)) {
                return field.join('^')
            } else if (typeof field === 'string') {
                return field
            }
        }).join('|')
    }).join('\r')
}