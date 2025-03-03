import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {

  getSmartAppCredentials() {
    // Client credentials
    const client_id = 'subscriptions'
    const client_secret = 'quOfCRS7ty1RMUQq'

    // Encode credentials in Base64
    const credentials = btoa(client_id + ':' + client_secret)

    return credentials
  }
}