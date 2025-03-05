import { createRoot } from 'react-dom/client'
// import '../../front/dist/smart-app-launch.subscriptions.umd.js'
import App from './App.tsx'
import 'antd/dist/reset.css'

createRoot(document.getElementById('root')!).render(
  <App />
)
