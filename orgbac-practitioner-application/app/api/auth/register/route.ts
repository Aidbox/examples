import { NextRequest, NextResponse } from 'next/server'
import { SessionService } from '@/lib/auth/session'
import { JWTService } from '@/lib/auth/jwt'
import { isValidEmail, validatePassword } from '@/lib/utils/validation'
import { generateOrganizationName } from '@/lib/utils/format'

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName } = await request.json()

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] },
        { status: 400 }
      )
    }

    const sessionService = new SessionService()
    const jwtService = new JWTService()
    const AIDBOX_URL = process.env.AIDBOX_URL || 'http://localhost:8080'

    try {
      // Step 1: Create a temporary JWT token WITHOUT organization claim for initial checks
      const tempUserId = 'temp-' + Date.now()
      const tempToken = await jwtService.generateToken({
        userId: tempUserId,
        email,
        practitionerRoleId: 'temp',
        organizationId: 'temp'
      })

      console.log('Generated temp token for registration:', { tempUserId, email })

      // Step 2: Check if user already exists using regular FHIR endpoint
      const userCheckResponse = await fetch(`${AIDBOX_URL}/fhir/User?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('User check response:', {
        status: userCheckResponse.status,
        statusText: userCheckResponse.statusText
      })

      if (userCheckResponse.ok) {
        const userBundle = await userCheckResponse.json()
        if (userBundle.entry && userBundle.entry.length > 0) {
          return NextResponse.json(
            { error: 'User with this email already exists' },
            { status: 400 }
          )
        }
      } else {
        console.warn('User check failed, proceeding with registration')
      }

      // Step 3: Generate organization name and create Organization using regular endpoint
      const organizationName = generateOrganizationName(firstName, lastName)
      
      const orgRequestBody = {
        resourceType: 'Organization',
        name: organizationName,
        active: true
      }

      const orgRequestOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tempToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orgRequestBody)
      }

      console.log('=== ORGANIZATION CREATION REQUEST ===')
      console.log('URL:', `${AIDBOX_URL}/fhir/Organization`)
      console.log('Method:', orgRequestOptions.method)
      console.log('Headers:', orgRequestOptions.headers)
      console.log('Body:', orgRequestBody)
      console.log('JWT Token Claims (decoded):', {
        userId: tempUserId,
        email,
        practitionerRoleId: 'temp',
        organizationId: 'temp',
        iss: process.env.JWT_ISSUER || 'https://auth.example.com'
      })
      console.log('JWT Token (raw):', tempToken)
      
      const orgResponse = await fetch(`${AIDBOX_URL}/fhir/Organization`, orgRequestOptions)

      console.log('=== ORGANIZATION CREATION RESPONSE ===')
      console.log('Status:', orgResponse.status)
      console.log('Status Text:', orgResponse.statusText)
      console.log('Response Headers:', Object.fromEntries(orgResponse.headers.entries()))

      if (!orgResponse.ok) {
        const errorText = await orgResponse.text()
        console.error('Organization creation failed:', errorText)
        throw new Error(`Failed to create organization: ${orgResponse.status} ${errorText}`)
      }

      const organization = await orgResponse.json()
      console.log('Created organization:', organization)

      // Step 4: Create a new JWT token WITH organization claim
      const orgToken = await jwtService.generateToken({
        userId: tempUserId,
        email,
        practitionerRoleId: 'temp',
        organizationId: organization.id
      })

      // Step 5: Create Practitioner using organization-based API
      const practitionerResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/Practitioner`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orgToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceType: 'Practitioner',
          name: [{
            given: [firstName],
            family: lastName
          }],
          telecom: [{
            system: 'email',
            value: email
          }],
          active: true
        })
      })

      if (!practitionerResponse.ok) {
        throw new Error('Failed to create practitioner')
      }

      const practitioner = await practitionerResponse.json()

      // Step 6: Create PractitionerRole using organization-based API
      const practitionerRoleResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/PractitionerRole`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orgToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceType: 'PractitionerRole',
          practitioner: { reference: `Practitioner/${practitioner.id}` },
          organization: { reference: `Organization/${organization.id}` },
          active: true
        })
      })

      if (!practitionerRoleResponse.ok) {
        throw new Error('Failed to create practitioner role')
      }

      const practitionerRole = await practitionerRoleResponse.json()

      // Step 7: Create User using organization-based API
      const userResponse = await fetch(`${AIDBOX_URL}/Organization/${organization.id}/fhir/User`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${orgToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resourceType: 'User',
          email,
          password, // Aidbox will hash this
          fhirUser: {
            reference: `PractitionerRole/${practitionerRole.id}`
          }
        })
      })

      if (!userResponse.ok) {
        throw new Error('Failed to create user')
      }

      const user = await userResponse.json()

      // Return success without creating session - user must log in
      const response = NextResponse.json({
        success: true,
        message: 'Account created successfully. Please log in.',
        user: {
          id: user.id,
          email: user.email,
          practitionerRoleId: practitionerRole.id,
          organizationId: organization.id
        }
      })

      return response
      
    } catch (registrationError: any) {
      console.error('Registration error:', registrationError)
      
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 400 }
    )
  }
}