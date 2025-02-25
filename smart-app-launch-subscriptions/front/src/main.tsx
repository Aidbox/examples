import './index.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './types'
import { StyleProvider, createCache } from '@ant-design/cssinjs'

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
    <link rel="stylesheet" href="./smart-app-launch-subscriptions-front.css">
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

    const cache = createCache()

    if (appContainer[0]) {
      ReactDOM.createRoot(appContainer[0]).render(
        <StyleProvider container={doc.head} cache={cache}>
          <App config={config} />
        </StyleProvider>
      )
    } else {
      throw new Error('iframe body not found')
    }
  }
}