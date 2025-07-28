import { NextRequest, NextResponse } from 'next/server'
import { AidboxClient } from '@/lib/aidbox/client'
import type { Patient } from '@/fhir.r4.sdk/types/hl7-fhir-r4-core'

export async function GET(request: NextRequest) {
  try {
    // Get organization ID from middleware headers
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get JWT token from Authorization header (set by middleware)
    const authHeader = request.headers.get('Authorization')
    const jwtToken = authHeader?.replace('Bearer ', '')

    if (!jwtToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const search = url.searchParams.get('search') || ''

    const aidbox = new AidboxClient(organizationId, jwtToken)
    
    // Search for patients in the organization
    let patients: Patient[] = []
    let totalPages = 1
    try {
      const searchParams: Record<string, string> = {
        '_count': limit.toString()
      }
      
      // Add search functionality (search by name)
      if (search) {
        searchParams['name'] = search
      }
      
      const bundle = await aidbox.searchResources<Patient>('Patient', searchParams)
      patients = bundle.entry?.map(entry => entry.resource) || []
      
      // Calculate pagination (simplified for demo)
      const totalCount = bundle.total || patients.length
      totalPages = Math.max(1, Math.ceil(totalCount / limit))
    } catch (aidboxError) {
      console.error('Failed to fetch patients from Aidbox:', aidboxError)
      // Continue with empty array if Aidbox is unavailable
    }

    // Transform patients for the frontend
    const transformedPatients = patients.map(patient => ({
      id: patient.id,
      name: {
        given: patient.name?.[0]?.given || ['Unknown'],
        family: patient.name?.[0]?.family || 'Patient'
      },
      birthDate: patient.birthDate || '',
      gender: patient.gender || 'unknown',
      phone: patient.telecom?.find(t => t.system === 'phone')?.value,
      email: patient.telecom?.find(t => t.system === 'email')?.value
    }))

    return NextResponse.json({ 
      patients: transformedPatients,
      totalPages,
      currentPage: page,
      total: transformedPatients.length
    })
  } catch (error) {
    console.error('Patients API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get organization ID from middleware headers
    const organizationId = request.headers.get('x-organization-id')
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get JWT token from Authorization header (set by middleware)
    const authHeader = request.headers.get('Authorization')
    const jwtToken = authHeader?.replace('Bearer ', '')

    if (!jwtToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const patientData = await request.json()
    
    const aidbox = new AidboxClient(organizationId, jwtToken)
    
    // Create patient using organization-based API
    try {
      // Build clean FHIR R4 Patient resource
      const patientResource: Partial<Patient> = {}

      // Only include fields that have values
      if (patientData.name) {
        patientResource.name = [patientData.name]
      }
      
      if (patientData.birthDate) {
        patientResource.birthDate = patientData.birthDate
      }
      
      if (patientData.gender && patientData.gender !== 'unknown') {
        patientResource.gender = patientData.gender
      }
      
      if (patientData.telecom && patientData.telecom.length > 0) {
        // Filter out any empty telecom entries
        const validTelecom = patientData.telecom.filter((t: any) => t && t.value)
        if (validTelecom.length > 0) {
          patientResource.telecom = validTelecom
        }
      }
      
      if (patientData.address && patientData.address.length > 0) {
        patientResource.address = patientData.address
      }

      // Create patient in Aidbox (organization context handled by endpoint URL)
      const createdPatient = await aidbox.createPatient(patientResource)

      return NextResponse.json(createdPatient)
    } catch (aidboxError) {
      console.error('Failed to create patient in Aidbox:', aidboxError)
      return NextResponse.json(
        { error: 'Failed to create patient' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Create patient API error:', error)
    return NextResponse.json(
      { error: 'Failed to create patient' },
      { status: 500 }
    )
  }
}