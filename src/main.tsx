import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { App } from './App'

// Remove any service worker or cache left over from earlier builds so old files are never served.
if ('serviceWorker' in navigator) void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()))
if ('caches' in window) void caches.keys().then((ks) => ks.forEach((k) => void caches.delete(k)))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
