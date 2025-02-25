import './index.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './types'

export const init = (containerId: string, config: SmartAppLaunchSubscriptionsConfig) => {
  if (!config.apiKey) {
    throw new Error('SmartAppLaunchSubscriptions cannot be initialized - "apiKey" is not defined')
  }

  const container = document.getElementById(containerId)
  if (container) {
    ReactDOM.createRoot(container).render(<App config={config} />)
  }
}