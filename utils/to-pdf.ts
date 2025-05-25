import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { RefObject } from "react"

export const toPdf = async (
  invoiceRef: RefObject<HTMLDivElement | null>, 
  fileName: string = 'hoa-don.pdf'
) => {
  if (!invoiceRef.current) 
    return;

  try {
    const canvas: HTMLCanvasElement = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffffff', 
    });

    const imgWidth: number = 210;
    const imgHeight: number = (canvas.height * imgWidth) / canvas.width;
    const pageHeight: number = 297;
    let heightLeft = imgHeight;
    let position = 0;

    const pdf: jsPDF = new jsPDF('p', 'mm', 'a4');
    const imgData: string = canvas.toDataURL('image/png');

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Lỗi khi tạo PDF:', error);
  }
}
