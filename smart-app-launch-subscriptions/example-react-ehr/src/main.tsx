import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
// import '../../front/dist/smart-app-launch.subscriptions.umd.js'
import App from './App.tsx'
import 'antd/dist/reset.css'

const themeConfig = {
  token: {
    colorPrimary: '#FFA500'
  }
}

createRoot(document.getElementById('root')!).render(
  <ConfigProvider theme={themeConfig}>
    <App />
  </ConfigProvider>
)
