import type { Organization, Practitioner, PractitionerRole } from '@/fhir.r4.sdk/types/hl7-fhir-r4-core'
import type { AidboxUser, ResourceTypeMap } from '@/fhir.r4.sdk/types'

const AIDBOX_URL = process.env.AIDBOX_URL || 'http://localhost:8080'
const AIDBOX_CLIENT_ID = process.env.AIDBOX_CLIENT_ID || 'log-in-practitioner'
const AIDBOX_CLIENT_SECRET = process.env.AIDBOX_CLIENT_SECRET || 'secret'

export class AidboxClient {
  private organizationId?: string
  private jwtToken?: string

  constructor(organizationId?: string, jwtToken?: string) {
    this.organizationId = organizationId
    this.jwtToken = jwtToken
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${AIDBOX_URL}/${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    }

    if (this.jwtToken) {
      headers['Authorization'] = `Bearer ${this.jwtToken}`
    }

    console.log('=== AIDBOX REQUEST ===')
    console.log('URL:', url)
    console.log('Method:', options.method || 'GET')
    console.log('Headers:', headers)
    if (options.body) {
      console.log('Body:', options.body)
    }

    const response = await fetch(url, {
      ...options,
      headers
    })

    console.log('=== AIDBOX RESPONSE ===')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Request failed:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get the correct API endpoint for a resource type
   * Uses organization-based API when organizationId is provided
   */
  private getResourceEndpoint(resourceType: string): string {
    if (this.organizationId) {
      return `Organization/${this.organizationId}/fhir/${resourceType}`
    }
    return `fhir/${resourceType}`
  }

  async createOrganization(data: {
    name: string
    active?: boolean
  }): Promise<Organization> {
    const organization = {
      resourceType: 'Organization' as const,
      name: data.name,
      active: data.active ?? true
    }
    
    return this.makeRequest('fhir/Organization', {
      method: 'POST',
      body: JSON.stringify(organization)
    })
  }

  async createPractitioner(data: {
    name: {
      given: string[]
      family: string
    }
    telecom?: Array<{
      system: 'phone' | 'email' | 'fax' | 'pager' | 'url' | 'sms' | 'other'
      value: string
    }>
    organizationId: string
  }): Promise<Practitioner> {
    const practitioner = {
      resourceType: 'Practitioner' as const,
      name: [data.name],
      telecom: data.telecom,
      active: true
    }
    
    return this.makeRequest(`Organization/${data.organizationId}/fhir/Practitioner`, {
      method: 'POST',
      body: JSON.stringify(practitioner)
    })
  }

  async createPractitionerRole(data: {
    practitioner: { reference: `Practitioner/${string}` }
    organization: { reference: `Organization/${string}` }
    active?: boolean
    organizationId: string
  }): Promise<PractitionerRole> {
    const practitionerRole = {
      resourceType: 'PractitionerRole' as const,
      practitioner: data.practitioner,
      organization: data.organization,
      active: data.active ?? true
    }
    
    return this.makeRequest(`Organization/${data.organizationId}/fhir/PractitionerRole`, {
      method: 'POST',
      body: JSON.stringify(practitionerRole)
    })
  }

  async createUser(data: {
    email: string
    password: string
    fhirUser: {
      reference: string
    }
    organizationId: string
  }): Promise<AidboxUser> {
    const user = {
      resourceType: 'User' as const,
      email: data.email,
      password: data.password,
      fhirUser: data.fhirUser
    }
    
    return this.makeRequest(`Organization/${data.organizationId}/fhir/User`, {
      method: 'POST',
      body: JSON.stringify(user)
    })
  }

  async searchUsers(params: { email: string }): Promise<AidboxUser[]> {
    const searchParams = new URLSearchParams()
    searchParams.set('.email', params.email)
    
    const bundle = await this.makeRequest(`fhir/User?${searchParams.toString()}`)
    return bundle.entry?.map((e: any) => e.resource as AidboxUser) || []
  }

  async getResource<T extends keyof ResourceTypeMap>(resourceType: T, id: string): Promise<ResourceTypeMap[T]> {
    const endpoint = this.getResourceEndpoint(resourceType as string)
    return this.makeRequest(`${endpoint}/${id}`)
  }

  async authenticateUser(email: string, password: string): Promise<{ user: AidboxUser | null; authenticated: boolean; access_token?: string; organizationId?: string }> {
    try {
      // Use OAuth2 password grant flow - NO JWT token needed for this
      const authPayload = {
        grant_type: 'password',
        username: email,
        password: password,
        client_id: AIDBOX_CLIENT_ID,
        client_secret: AIDBOX_CLIENT_SECRET
      }
      
      const url = `${AIDBOX_URL}/auth/token`
      
      console.log('=== PASSWORD GRANT REQUEST ===')
      console.log('URL:', url)
      console.log('Payload:', authPayload)
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authPayload)
      })
      
      console.log('=== PASSWORD GRANT RESPONSE ===')
      console.log('Status:', response.status)
      console.log('Status Text:', response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Authentication failed:', errorText)
        return {
          user: null,
          authenticated: false
        }
      }
      
      const result = await response.json()
      console.log('Auth result:', result)
      
      if (result.access_token && result.userinfo) {
        // Extract organization ID from meta.extension
        let organizationId: string | undefined
        const extensions = result.userinfo.meta?.extension
        if (extensions && Array.isArray(extensions)) {
          const orgExtension = extensions.find((ext: any) => 
            ext.url === 'https://aidbox.app/tenant-organization-id'
          )
          if (orgExtension?.value?.Reference?.id) {
            organizationId = orgExtension.value.Reference.id
          }
        }
        
        return {
          user: result.userinfo,
          authenticated: true,
          access_token: result.access_token,
          organizationId
        }
      }
      
      return {
        user: null,
        authenticated: false
      }
    } catch (error) {
      console.error('Authentication error:', error)
      return {
        user: null,
        authenticated: false
      }
    }
  }

  /**
   * Search for resources of a specific type within the organization
   * Uses organization-based API when organizationId is provided
   */
  async searchResources<T>(resourceType: string, searchParams?: Record<string, string>): Promise<{ entry: { resource: T }[], total?: number }> {
    const params = new URLSearchParams(searchParams)
    const endpoint = this.getResourceEndpoint(resourceType)
    const queryString = params.toString()
    const fullEndpoint = queryString ? `${endpoint}?${queryString}` : endpoint
    
    return this.makeRequest(fullEndpoint)
  }

  /**
   * Create a patient using organization-based API
   */
  async createPatient(data: any): Promise<any> {
    if (!this.organizationId || !this.jwtToken) {
      throw new Error('Organization ID and JWT token are required for patient creation')
    }

    const endpoint = this.getResourceEndpoint('Patient')
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Count resources of a specific type
   * Uses the _count search parameter for efficient counting
   */
  async countResources(resourceType: string): Promise<number> {
    try {
      const searchParams = new URLSearchParams()
      searchParams.set('_count', '0')
      searchParams.set('_total', 'accurate')
      
      const endpoint = this.getResourceEndpoint(resourceType)
      const bundle = await this.makeRequest(`${endpoint}?${searchParams.toString()}`)
      
      return bundle.total || 0
    } catch (error) {
      console.error(`Failed to count ${resourceType} resources:`, error)
      return 0
    }
  }
}