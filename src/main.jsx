import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme'
import App from './App'
import { VulnerabilityProvider } from './context/VulnerabilityContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* Add auth */}
      {/* Add vulnerability wrapper */}
      <CssBaseline />
      <VulnerabilityProvider>
      <App />
      </VulnerabilityProvider>
    </ThemeProvider>

  </React.StrictMode>
)