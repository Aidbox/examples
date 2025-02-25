import './index.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './types'

export const init = (containerId: string, config: SmartAppLaunchSubscriptionsConfig) => {
  if (!config.apiKey) {
    throw new Error('SmartAppLaunchSubscriptions cannot be initialized - "apiKey" is not defined')
  }

  const container = document.getElementById(containerId)
  if (!container) {
    throw new Error(`Element with id "${containerId}" not found`)
  }

  const iframe = document.createElement('iframe')
  iframe.style.border = 'none'

  // todo - use iframe.src instead of iframe.srcdoc
  // iframe.src = './widget.html'
  iframe.srcdoc = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Widget</title>
  </head>
  <body>
    <div id="app"></div>
  </body>
  </html>
`

  container.appendChild(iframe)

  iframe.onload = () => {
    console.log('iframe.onload')
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      throw new Error('Failed to access iFrame document')
    }

    const appContainer = doc.getElementsByTagName('body')

    if (appContainer[0]) {
      ReactDOM.createRoot(appContainer[0]).render(<App config={config} />)
    } else {
      throw new Error('iframe body not found')
    }
  }
}