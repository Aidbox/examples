import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  getSmartAppCredentials() {
    const client_id = this.configService.get<string>('CLIENT_ID')
    const client_secret = this.configService.get<string>('CLIENT_SECRET')

    const credentials = Buffer.from(`${client_id}:${client_secret}`).toString('base64')

    return credentials
  }
}