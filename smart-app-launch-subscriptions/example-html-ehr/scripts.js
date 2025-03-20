const launch = (userId) => {
  const fhirUrl = 'http://localhost:8080/rpc'
  let body = {
    method: 'aidbox.smart/get-launch-uri',
    params: {
      user: 'practitioner',
      iss: 'http://localhost:8080/fhir', //
      client: 'subscriptions',
      ctx: { user: userId }
    }
  }

  const client_id = 'subscriptions'
  const client_secret = 'quOfCRS7ty1RMUQq'

  const credentials = btoa(client_id + ':' + client_secret)


  fetch(fhirUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + credentials,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
    .then(response => response.json())
    .then(resp => {
      console.log('Launch response:', resp)

      // window.open(resp.result.uri, '_blank')
      window.open(resp.result.uri, 'smartAuthPopup', 'width=800,height=600')
    })
    .catch(error => {
      console.error('Error launching app:', error)
    })
}

const loginAidbox = async (username, password) => {
  const AIDBOX_URL = 'http://localhost:8080'

  try {
    const response = await fetch(`${AIDBOX_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: 'ehr-outpatient',
        client_secret: 'verysecret',
        username,
        password
      })
    })

    if (!response.ok) {
      throw new Error(`Login failed: ${response.statusText}`)
    }

    return response.json()
  } catch (e) {
    return null
  }
}

const setAuthState = (id, name) => {
  document.getElementById('login-page').style.display = id ? 'none' : null
  document.getElementById('patients-page').style.display = id ? null : 'none'
  document.getElementById('notifications-container').style.display = id ? null : 'none'
}

const loginUser = async (uid, pwd) => {
  const loginData = await loginAidbox(uid, pwd)
  if (loginData) {
    const token = loginData.access_token
    const practitionerId = loginData.userinfo.data?.practitioner?.id
    if (window.SmartAppLaunchSubscriptions) {
      window.SmartAppLaunchSubscriptions.setUser(practitionerId)
    }
    setAuthState(loginData.userinfo.id, loginData.userinfo.email)
  }
}

const onLogout = () => {
  if (window.SmartAppLaunchSubscriptions) {
    window.SmartAppLaunchSubscriptions.setUser(null)
  }
  setAuthState(null)
}

const onLogin = () => {
  const uid = document.getElementById('login-uid').value
  const pwd = document.getElementById('login-pwd').value

  loginUser(uid, pwd)
}

(() => {
  document.getElementById('launchButton').addEventListener('click', function () {
    launch('doctor-user')
  })

  window.addEventListener('message', (event) => {
    if (event.data.smartappSubscriptionsUrl) {
      console.log('Received SmartAppSubscriptions URL:', event.data.smartappSubscriptionsUrl)
      document.getElementById('test-smart-app').src = event.data.smartappSubscriptionsUrl
    }
  }, false)

  setAuthState(null)
})()