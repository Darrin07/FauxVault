// The test set-up will run before every test file. Adds jest-dom matchers.
import '@testing-library/jest-dom'

// 2026-05-03: before syncing feature/dashboard-ui to origin/feature/dashboard-ui
// The service and page tests use localStorage directly, so provide a deterministic
// browser-style storage mock for the Vitest runtime.
const storage = {}

const localStorageMock = {
    getItem(key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null
    },
    setItem(key, value) {
        storage[key] = String(value)
    },
    removeItem(key) {
        delete storage[key]
    },
    clear() {
        Object.keys(storage).forEach((key) => delete storage[key])
    },
}

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true,
})

if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
        writable: true,
    })
}
