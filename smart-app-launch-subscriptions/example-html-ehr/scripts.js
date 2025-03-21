const AIDBOX_URL = 'http://localhost:8080'

const smartAllLaunchSubscriptions = (userId) => {
  const fhirUrl = `${AIDBOX_URL}/rpc`
  const client = 'subscriptions'
  const clientSecret = 'quOfCRS7ty1RMUQq'
  const credentials = btoa(client + ':' + clientSecret)

  let body = {
    method: 'aidbox.smart/get-launch-uri',
    // todo - check if we can pass context as practitioner + patient
    params: {
      user: 'practitioner',
      iss: `${AIDBOX_URL}/fhir`,
      client,
      ctx: { user: userId }
    }
  }

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
    const practitionerId = loginData.userinfo.data?.practitioner?.id
    localStorage.setItem('practitionerId', practitionerId)
    // if (window.SmartAppLaunchSubscriptions) {
    //   window.SmartAppLaunchSubscriptions.setUser(practitionerId)
    // }
    setAuthState(loginData.userinfo.id, loginData.userinfo.email)
  }
}

const onLogout = () => {
  // if (window.SmartAppLaunchSubscriptions) {
  //   window.SmartAppLaunchSubscriptions.setUser(null)
  // }
  localStorage.setItem('practitionerId', undefined)
  setAuthState(null)
}

const onLogin = () => {
  const uid = document.getElementById('login-uid').value
  const pwd = document.getElementById('login-pwd').value

  loginUser(uid, pwd)
}

(() => {
  document.getElementById('launchButton').addEventListener('click', () => {
    const practitionerId = localStorage.getItem('practitionerId')
    console.log(`Launch smart app subscriptions for practitioner: ${practitionerId}`)
    smartAllLaunchSubscriptions(practitionerId)
  })

  window.addEventListener('message', (event) => {
    if (event.data.smartappSubscriptionsUrl) {
      console.log('Received SmartAppSubscriptions URL:', event.data.smartappSubscriptionsUrl)
      const iframe = document.getElementById('test-smart-app')
      iframe.src = event.data.smartappSubscriptionsUrl
      iframe.classList.remove('hidden')


      document.getElementById('launchButton').classList.add('hidden')
    }
  }, false)

  setAuthState(null)
})()