import { createRoot } from 'react-dom/client'
import './index.css'
import '../../front/dist/smart-app-launch.subscriptions.umd.js'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)
