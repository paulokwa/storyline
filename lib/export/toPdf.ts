import { toHtml } from './toHtml'
import type { ExportPayload, ExportOptions } from './buildExportPayload'

export async function toPdf(payload: ExportPayload, options: ExportOptions): Promise<void> {
    const htmlContent = toHtml(payload, options)

    // Inject print-specific CSS so the browser print dialog produces a clean page
    const printCss = `
        @media print {
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { margin: 1.5cm; }
        }`
    const printHtml = htmlContent.replace('</style>', `${printCss}\n    </style>`)

    const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const printWindow = window.open(url, '_blank', 'width=900,height=700')
    if (!printWindow) {
        URL.revokeObjectURL(url)
        throw new Error('Popup blocked. Please allow popups for this site and try again.')
    }

    await new Promise<void>((resolve, reject) => {
        const giveUp = setTimeout(() => {
            URL.revokeObjectURL(url)
            reject(new Error('Print window timed out.'))
        }, 15000)

        printWindow.addEventListener('load', () => {
            clearTimeout(giveUp)
            // Short pause for fonts/layout to settle before the dialog appears
            setTimeout(() => {
                printWindow.print()
                URL.revokeObjectURL(url)
                resolve()
            }, 400)
        }, { once: true })
    })
}
