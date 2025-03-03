import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import LoginForm from './login'

declare global {
  interface Window {
    SmartAppLaunchSubscriptions?: {
      init: (containerId: string, config: { apiKey: string }) => void
      setUser: (uid: string | null) => void
    }
  }
}

function App() {
  const [count, setCount] = useState(0)
  const [smartAppInitialized, setSmartAppInitialized] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    try {
      if (!smartAppInitialized && window.SmartAppLaunchSubscriptions) {
        const apiKey = import.meta.env.VITE_SMARTAPP_SUBSCRIPTIONS_API
        window.SmartAppLaunchSubscriptions.init('notifications-container', {
          apiKey
        })
        setSmartAppInitialized(true)
      } else {
        throw new Error('window.SmartAppLaunchSubscriptions is not available')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const login = async (username: string, password: string) => {
    const aidboxUrl = import.meta.env.VITE_AIDBOX_URL

    if (!aidboxUrl) {
      throw new Error('aidboxUrl is not defined')
    }

    const response = await fetch(`${aidboxUrl}/auth/token`, {
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
      throw new Error(`Login failed: ${response.statusText}`);
    }

    const loginData = await response.json()

    setUser(loginData)
    if (smartAppInitialized && window.SmartAppLaunchSubscriptions) {
      const practitionerId = loginData.userinfo.data?.practitioner?.id
      window.SmartAppLaunchSubscriptions.setUser(practitionerId)
    }
  }

  const logout = async () => {
    setUser(null)
    if (smartAppInitialized && window.SmartAppLaunchSubscriptions) {
      window.SmartAppLaunchSubscriptions.setUser(null)
    }
  }

  return (
    <>
      {
        user ?
          <button onClick={logout}>
            Logout
          </button>
          :
          <LoginForm onSubmit={login} />
      }
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      {/* <div id="notifications-container"></div> */}
      <div id="notifications-container" style={{ display: user ? 'block' : 'none' }}></div>
    </>
  )
}

export default App
