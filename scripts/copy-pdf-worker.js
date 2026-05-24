// Copies the pdfjs-dist worker to public/ so it can be served as a static asset.
// Run automatically via the postinstall lifecycle hook (after npm install / npm ci).
// The file is gitignored — this script keeps it version-matched with the installed package.
const { copyFileSync } = require('fs')
const { resolve } = require('path')

const src = resolve(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
const dest = resolve(__dirname, '../public/pdf.worker.min.mjs')

try {
    copyFileSync(src, dest)
    console.log('✓ pdf.worker.min.mjs copied to public/')
} catch (err) {
    console.error('✗ Failed to copy pdf.worker.min.mjs:', err.message)
    process.exit(1)
}
