import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
const files = [
  'KHR nyilatkozat.pdf'
];
(async () => {
  for (const file of files) {
    try {
      const bytes = fs.readFileSync('./public/pdf-templates/' + file);
      const pdfDoc = await PDFDocument.load(bytes);
      const form = pdfDoc.getForm();
      try {
        const field = form.getTextField('Kelt_i');
        field.setText('2024. 10. 12.');
      } catch (e) {
        console.log('Kelt_i not found');
      }
      
      const newBytes = await pdfDoc.save();
      fs.writeFileSync('test_output.pdf', newBytes);
      console.log('Saved test_output.pdf');
    } catch(e) {}
  }
})();
