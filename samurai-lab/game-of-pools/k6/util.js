import http from 'k6/http'
import { check } from 'k6'
import { b64encode } from 'k6/encoding'

export function jsonPatch(obj, path, value) {
  let pt = obj;
  const ks = path.split('.');
  while (ks.length > 1) pt = pt[ks.shift()];
  pt[ks.shift()] = value;
  return obj;
}

export function is200 (url, params) {
  const res = http.get(url, params)
  return check(res, {'Status 200': ({ status }) => status === 200})
}

const oauth2 = () => {
  const user = __ENV.OAUTH2_USER
  const pass = __ENV.OAUTH2_PASSWORD

  if (!user || !pass) return null

  const loginURL = __ENV.OAUTH2_LOGIN_URL
  const tokenURL = __ENV.OAUTH2_TOKEN_URL

  if (!loginURL && !tokenURL) return null

  const challenge = "my_challenge"

  const authCode = http.post(loginURL, JSON.stringify({
    email: user,
    password: pass,
    codeChallengeMethod: "plain",
    codeChallenge: challenge,
  }), { headers: {"Content-Type": "application/json"}, responseType: 'text' })

  if (!check(authCode, { 'OAuth2 auth code': ({ status }) => status === 200 })) {
    console.log("auth code request failed:", authCode.body)
    return null
  }

  const token = http.post(
    tokenURL,
    `grant_type=authorization_code&code=${authCode.json('code')}&code_verifier=${challenge}`,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, responseType: 'text' })

  if (!check(token, { 'OAuth2 access token': ({ status }) => status === 200 })) {
    console.log('auth token request failed', token.body)
    return null
  }

  return {"Authorization": `Bearer ${token.json('access_token')}` }
}

export function headers() {
  return {
    ...oauth2(),
    "Accept-Encoding": "gzip",
    "Accept": "application/json",
    "Content-Type": "application/json",
  }
}

const base64 = (user, pass) =>  user && pass ? `Basic ${b64encode(`${user}:${pass}`)}` : null

export default function() {
  const user = __ENV.AUTH_USER
  const pass = __ENV.AUTH_PASSWORD
  const auth = oauth2(user, pass) || base64(user, pass)

  console.log(JSON.stringify(auth ? { Authorization: auth } : {}))
}