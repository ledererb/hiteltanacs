import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function run() {
  const bytes = fs.readFileSync('public/pdf-templates/ML104U-Megbizott-penzugyi-tanacsado-meghatalmazasa_KEHOP.pdf');
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const fields = form.getFields();

  fields.forEach((f, i) => {
    try {
      console.log(`${i}: [${f.constructor.name}] ${f.getName()} = "${f.getText ? f.getText() : ''}"`);
    } catch {
      console.log(`${i}: ${f.getName()}`);
    }
  });
}
run();
