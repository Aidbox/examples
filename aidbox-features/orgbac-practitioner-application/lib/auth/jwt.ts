import { SignJWT, jwtVerify } from 'jose'

interface TokenPayload {
  userId: string
  email: string
  practitionerRoleId: string
  organizationId: string
}

export class JWTService {
  private readonly secret: Uint8Array
  private readonly issuer: string
  private readonly expiresIn: string

  constructor() {
    // Convert secret to Uint8Array for jose
    this.secret = new TextEncoder().encode(process.env.JWT_SECRET || 'very-secret') // Must match Aidbox TokenIntrospector
    this.issuer = process.env.JWT_ISSUER || 'https://auth.example.com' // Must match Aidbox TokenIntrospector
    this.expiresIn = process.env.JWT_EXPIRATION || '24h'
  }

  async generateToken(payload: TokenPayload): Promise<string> {
    const jwt = new SignJWT({
      // Standard JWT claims
      sub: payload.userId,
      email: payload.email,
      
      // Required for Aidbox AccessPolicy
      organization: payload.organizationId,
      
      // Additional claims
      practitionerRoleId: payload.practitionerRoleId
    })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(this.issuer)
    .setExpirationTime('24h')

    return await jwt.sign(this.secret)
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: this.issuer
      })
      
      return {
        userId: payload.sub!,
        email: payload.email as string,
        practitionerRoleId: payload.practitionerRoleId as string,
        organizationId: payload.organization as string // Note: using 'organization' claim
      }
    } catch (error) {
      console.error('JWT verification error:', error)
      return null
    }
  }

  // For Aidbox TokenIntrospector
  async introspectToken(token: string): Promise<{
    active: boolean
    sub?: string
    email?: string
    organization?: string
  }> {
    const payload = await this.verifyToken(token)
    if (!payload) {
      return { active: false }
    }

    return {
      active: true,
      sub: payload.userId,
      email: payload.email,
      organization: payload.organizationId // Must use 'organization' for AccessPolicy
    }
  }
}