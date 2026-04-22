import { useContext } from 'react'
import { VulnerabilityContext } from '../context/VulnerabilityContext'

export function useVulnerabilities() {
  const context = useContext(VulnerabilityContext)
  if (!context) {
    throw new Error('useVulnerabilities must be used within a VulnerabilityProvider')
  }
  return context
}
