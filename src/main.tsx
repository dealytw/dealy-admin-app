import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { health } from './api/strapiClient'

// Clear any old service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Quick test
console.log('VITE_STRAPI_URL =', import.meta.env.VITE_STRAPI_URL);

createRoot(document.getElementById("root")!).render(<App />);
