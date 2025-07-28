import { NextRequest, NextResponse } from 'next/server'
import { AidboxClient } from '@/lib/aidbox/client'

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

    const aidbox = new AidboxClient(organizationId, jwtToken)
    
    // Get patient count using organization-based API
    let patientCount = 0
    try {
      patientCount = await aidbox.countResources('Patient')
    } catch (aidboxError) {
      console.error('Failed to get patient count from Aidbox:', aidboxError)
      // Continue with 0 count if Aidbox is unavailable
    }
    
    // Mock data for appointments and tasks
    // In a real app, these would come from actual resources
    const stats = {
      totalPatients: patientCount,
      todayAppointments: 0,
      pendingTasks: 0
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}