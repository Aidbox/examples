import { Invoice } from "../types/hl7-fhir-r4-core"

const base_url = process.env.AIDBOX_BASE_URL
const creds = process.env.AIDBOX_CREDENTIALS

export async function getInvoiceResources(invoice: Invoice){
    let res = await fetch([base_url,
        '/fhir/Invoice',
        `?_id=${invoice.id}`,
        '&_include=Invoice:subject:Patient',
        '&_include=Invoice:recipient:Patient',
        '&_include=Invoice:participant',
        '&_include=Invoice:charge-item:ChargeItem',
        '&_include:iterate=ChargeItem:service:Procedure',
        '&_include:iterate=ChargeItem:context',
        '&_include:iterate=ChargeItem:account:Account',
        '&_include:iterate=Encounter:reason-reference',
        '&_include:iterate=Encounter:location:Location',
        '&_include:iterate=Encounter:diagnosis:Condition',
        '&_include:iterate=EpisodeOfCare:condition:Condition',
        '&_include:iterate=Account:coverage:Coverage',
        '&_include:iterate=Coverage:policy-holder:Organization'
    ].join(''),
    {headers: [['Authorization', `Basic ${creds}`],
        ['Accept', 'application/fhir+json']
    ]})
    return res.json()
}