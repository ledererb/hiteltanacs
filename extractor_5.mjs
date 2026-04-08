import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

const files = [
  'Kiemelt közszereplői nyilatkozat.pdf',
  'Tényleges tulajdonosi nyilatkozat.pdf',
  'Összefoglaló nyilatkozat.pdf',
  'Horizontális követelmények nyilatkozat.pdf',
  'Tulajdonosi hozzájárulás nyilatkozat.pdf'
];

(async () => {
    for (const file of files) {
        try {
          const bytes = fs.readFileSync(`./public/pdf-templates/${file}`);
          const pdfDoc = await PDFDocument.load(bytes);
          const fields = pdfDoc.getForm().getFields();
          console.log(`\n\n=== ${file} ===`);
          fields.forEach(f => {
             console.log(`['${f.getName()}']`);
          });
        } catch(e) {
          console.error(e.message);
        }
    }
})();
