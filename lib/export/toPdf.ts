import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { toHtml } from './toHtml'
import type { ExportPayload, ExportOptions } from './buildExportPayload'

export async function toPdf(payload: ExportPayload, options: ExportOptions): Promise<Blob> {
    const htmlContent = toHtml(payload, options)
    
    // 1. Create a dummy container to render HTML for capture
    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '-9999px'
    container.style.top = '0'
    container.style.width = '800px' // Same as in toHtml.ts style
    container.innerHTML = htmlContent
    document.body.appendChild(container)

    // 2. Wait for layout
    await new Promise(resolve => setTimeout(resolve, 500))

    // 3. Render and save PDF
    // Note: We use standard A4 size
    const canvas = await html2canvas(container, {
        scale: 2, // Higher quality
        useCORS: true,
        logging: false,
    })
    
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
    })

    const imgProps = pdf.internal.pageSize
    const pdfWidth = imgProps.width
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    
    let heightLeft = pdfHeight
    let position = 0

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
    heightLeft -= imgProps.height

    // Add multi-page logic
    while (heightLeft >= 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= imgProps.height
    }

    const blob = pdf.output('blob')
    document.body.removeChild(container)
    return blob
}
