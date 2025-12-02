import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id ${elementId} not found`);
    }

    try {
        // Create canvas from the element
        const canvas = await html2canvas(element, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // Enable cross-origin images
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Calculate PDF dimensions
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add subsequent pages if content overflows
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(fileName);
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
