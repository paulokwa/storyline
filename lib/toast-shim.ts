/**
 * A simple toast fallback to prevent build errors when sonner is missing.
 * Ideally, install sonner: npm install sonner
 */
export const toast = {
    error: (message: string) => {
        console.error('Toast [Error]:', message)
    },
    success: (message: string) => {
        console.log('Toast [Success]:', message)
    },
    info: (message: string) => {
        console.log('Toast [Info]:', message)
    }
}
