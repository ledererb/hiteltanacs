import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

(async () => {
    try {
      const bytes = fs.readFileSync('./public/pdf-templates/KHR nyilatkozat.pdf');
      const pdfDoc = await PDFDocument.load(bytes);
      const fields = pdfDoc.getForm().getFields();
      fields.forEach(f => {
         console.log(`PONTOS_NEV: [${f.getName()}]`);
      });
    } catch(e) {
      console.error(e.message);
    }
})();
