import { mockDelay } from './client'

//Test: PUT /api/vuln/toggle
//This should change vuln middleware
export async function toggleModule(moduleId, enabled) {
    await mockDelay(150)

    //Debug: Tell me in console what would change, as no middleware to confirm
    console.log(`Module is: ${moduleId} → ${enabled ? 'VULNERABLE' : 'HARDENED'}`)

    //return module and status
    return { id: moduleId, enabled }
}

//TEST:  GET /api/vuln/modules

//function: get Modules
export async function getModules() {
    await mockDelay()
   //no persisted state; add later
    return []
}
