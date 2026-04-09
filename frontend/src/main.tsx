import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/themes.css'

document.documentElement.setAttribute('data-theme', 'warm-tavern')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
