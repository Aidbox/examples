import './index.css'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './interfaces'
import { StyleProvider, createCache } from '@ant-design/cssinjs'
import { AppProvider } from './context/app'

let iframeRef: HTMLIFrameElement | null = null

export const init = (containerId: string, config: SmartAppLaunchSubscriptionsConfig) => {
  if (!config.apiKey) {
    throw new Error('SmartAppLaunchSubscriptions cannot be initialized - "apiKey" is not defined')
  }

  const container = document.getElementById(containerId)
  if (!container) {
    throw new Error(`Element with id "${containerId}" not found`)
  }

  const iframe = document.createElement('iframe')
  iframeRef = iframe
  iframe.allowFullscreen = true
  iframe.style.border = 'none'
  iframe.style.colorScheme = 'none'

  iframe.style.position = 'fixed'
  iframe.style.right = '10px'
  iframe.style.bottom = '10px'

  // todo - try iframe.src instead of iframe.srcdoc
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
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    const iframeWindow = iframe.contentWindow

    if (!iframeDoc) {
      throw new Error('Failed to access iFrame document')
    }

    if (!iframeWindow) {
      throw new Error('Failed to access iFrame window')
    }

    /* cruel hack to make antd popover work in iframe */
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.setPrototypeOf((iframeWindow as any).HTMLElement.prototype, HTMLElement.prototype)
    } catch (e) { console.log(e) }
    /* cruel hack to make antd popover work in iframe */

    const appContainer = iframeDoc.getElementsByTagName('body')

    const cache = createCache()

    if (appContainer[0]) {
      ReactDOM.createRoot(appContainer[0]).render(
        <StyleProvider container={iframeDoc.head} cache={cache}>
          <AppProvider config={config}>
            <App iframe={iframe} iframeDoc={iframeDoc} iframeWindow={iframeWindow} />
          </AppProvider>
        </StyleProvider>
      )
    } else {
      throw new Error('iframe body not found')
    }
  }
}

export const setUser = (uid: string) => {
  if (iframeRef?.contentWindow) {
    iframeRef.contentWindow.postMessage({ type: 'SET_USER', uid }, '*')
  } else {
    console.warn('iframe is not initialized yet')
  }
}