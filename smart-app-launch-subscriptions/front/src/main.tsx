import './index.css'
import { createRoot } from 'react-dom/client'
import App from './App'
import { SmartAppLaunchSubscriptionsConfig } from './interfaces'
import { StyleProvider } from '@ant-design/cssinjs'
import { AppProvider } from './context/app'
import { BrowserRouter } from 'react-router-dom'

const config: SmartAppLaunchSubscriptionsConfig = {
  apiKey: 'http://localhost:9000'
}

createRoot(document.getElementById('root')!).render(
  <StyleProvider>
    <AppProvider config={config}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </StyleProvider>
)
