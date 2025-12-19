import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePdf = async (elementIds: string | string[], fileName: string) => {
    const ids = Array.isArray(elementIds) ? elementIds : [elementIds];
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm

    try {
        for (let i = 0; i < ids.length; i++) {
            const element = document.getElementById(ids[i]);
            if (!element) {
                console.warn(`Element with id ${ids[i]} not found, skipping`);
                continue;
            }

            // Clone the element to ensure it's captured correctly without scroll issues
            const clone = element.cloneNode(true) as HTMLElement;

            // Style the clone to ensure it renders correctly
            clone.style.position = 'fixed';
            clone.style.top = '0';
            clone.style.left = '0';
            clone.style.width = '210mm'; // Force A4 width
            clone.style.height = 'auto'; // Allow height to grow with content
            clone.style.minHeight = '297mm'; // Minimum A4 height
            clone.style.zIndex = '-9999'; // Hide behind everything
            clone.style.margin = '0';
            clone.style.transform = 'none'; // Reset any transforms

            // Append to body
            document.body.appendChild(clone);

            // Create canvas from the clone
            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight
            });

            // Remove clone
            document.body.removeChild(clone);

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const imgHeight = (canvas.height * pageWidth) / canvas.width;

            // If it's not the first element, add a new page
            if (i > 0) {
                pdf.addPage();
            }

            // If the element itself is taller than one page (like the content section),
            // we still need to handle the slicing for that specific element.
            let heightLeft = imgHeight;
            const position = 0;

            // Add first part of this element
            pdf.addImage(imgData, 'JPEG', 0, position, pageWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add subsequent pages for this element if it overflows
            let pageIndex = 1;
            // Add a small tolerance (e.g. 5mm) to avoid creating a new page for negligible overflow
            while (heightLeft > 5) {
                pdf.addPage();
                // Shift the image up by the page height * index
                const yPosition = -(pageHeight * pageIndex);
                pdf.addImage(imgData, 'JPEG', 0, yPosition, pageWidth, imgHeight);
                heightLeft -= pageHeight;
                pageIndex++;
            }
        }

        pdf.save(fileName);
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};
