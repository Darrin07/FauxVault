import { useContext } from 'react'
import { VulnerabilityContext } from '../context/VulnerabilityContext'

//Calls on the Vulnerability context to connec to components

export function useVulnerabilities() {
  const context = useContext(VulnerabilityContext)

  //if no vulnerability context
  if (!context) {
    throw new Error('vulnerability context not found')
  }
  return context
}
