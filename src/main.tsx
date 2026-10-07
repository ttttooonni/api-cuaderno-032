import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './routes/App'
import './styles.css'
import { registerServiceWorker } from './lib/pwa/update'

registerServiceWorker()
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
