import { JWTService } from './jwt'

interface SessionData {
  userId: string
  email: string
  practitionerRoleId: string
  organizationId: string
}

export class SessionService {
  private jwtService: JWTService

  constructor() {
    this.jwtService = new JWTService()
  }

  async createSession(sessionData: SessionData): Promise<string> {
    return await this.jwtService.generateToken(sessionData)
  }

  async validateSession(token: string): Promise<SessionData | null> {
    return await this.jwtService.verifyToken(token)
  }

  async introspectToken(token: string) {
    return await this.jwtService.introspectToken(token)
  }

  async clearSession(): Promise<void> {
    // Session is managed via JWT tokens, no server-side storage to clear
    // Client should remove the cookie/token
  }
}