import './index.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './types'
import { StyleProvider, createCache } from '@ant-design/cssinjs'

// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <App config={{ apiKey: 'asd' }} iframeDocument={document} />
// )

export const init = (containerId: string, config: SmartAppLaunchSubscriptionsConfig) => {
  if (!config.apiKey) {
    throw new Error('SmartAppLaunchSubscriptions cannot be initialized - "apiKey" is not defined')
  }

  const container = document.getElementById(containerId)
  if (!container) {
    throw new Error(`Element with id "${containerId}" not found`)
  }

  const iframe = document.createElement('iframe')
  iframe.style.height = '100%'
  iframe.style.width = '100%'
  iframe.style.border = 'none'
  iframe.allowFullscreen = true

  // todo - use iframe.src instead of iframe.srcdoc
  // todo - fix smart-app-launch-subscriptions-front.css path
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

    /* cruel hack to make antd popover work in iframe */
    try {
      const iframeWindow = iframe.contentWindow
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.setPrototypeOf((iframeWindow as any).HTMLElement.prototype, HTMLElement.prototype)
    } catch (e) { console.log(e) }

    const appContainer = doc.getElementsByTagName('body')

    const cache = createCache()

    if (appContainer[0]) {
      ReactDOM.createRoot(appContainer[0]).render(
        <StyleProvider container={doc.head} cache={cache}>
          <App config={config} iframeDocument={doc} />
        </StyleProvider>
      )
    } else {
      throw new Error('iframe body not found')
    }
  }
}