import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

declare global {
  interface Window {
    SmartAppLaunchSubscriptions?: {
      init: (containerId: string, config: { apiKey: string }) => void
    }
  }
}

function App() {
  const [count, setCount] = useState(0)
  const [smartAppInitialized, setSmartAppInitialized] = useState(false)

  useEffect(() => {
    try {
      if (!smartAppInitialized && window.SmartAppLaunchSubscriptions && typeof window.SmartAppLaunchSubscriptions.init === 'function') {
        const apiKey = import.meta.env.VITE_SMARTAPP_SUBSCRIPTIONS_API
        setSmartAppInitialized(true)
        window.SmartAppLaunchSubscriptions.init('notifications-container', {
          apiKey
        })
      } else {
        throw new Error('window.SmartAppLaunchSubscriptions is not available')
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <>
      <div id="notifications-container"></div>
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
    </>
  )
}

export default App
