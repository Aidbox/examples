import { NextRequest, NextResponse } from 'next/server'
import { SessionService } from '@/lib/auth/session'
import { AidboxClient } from '@/lib/aidbox/client'
import type { PractitionerRole } from '@/fhir.r4.sdk/types/hl7-fhir-r4-core'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const aidbox = new AidboxClient()
    const sessionService = new SessionService()

    try {
      // Authenticate user with Aidbox
      const authResult = await aidbox.authenticateUser(email, password)
      
      if (!authResult.authenticated || !authResult.user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      const user = authResult.user

      // Get PractitionerRole ID from fhirUser
      if (!user.fhirUser?.id) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        )
      }

      const practitionerRoleId = user.fhirUser.id
      
      // Get Organization ID from auth response
      const organizationId = authResult.organizationId
      if (!organizationId) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      // Create session
      const token = await sessionService.createSession({
        userId: user.id!,
        email: user.email,
        practitionerRoleId: practitionerRoleId,
        organizationId
      })

      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          practitionerRoleId: practitionerRoleId,
          organizationId
        }
      })

      // Set the auth token as a cookie
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 // 24 hours
      })

      return response
      
    } catch (aidboxError: any) {
      console.error('Aidbox error:', aidboxError)
      
      // Handle specific Aidbox errors
      if (aidboxError.response?.data?.issue) {
        const issue = aidboxError.response.data.issue[0]
        return NextResponse.json(
          { error: issue.diagnostics || 'Login failed' },
          { status: 401 }
        )
      }
      
      return NextResponse.json(
        { error: 'An error occurred during login. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    )
  }
}