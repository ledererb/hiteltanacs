import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import { supabase } from '../lib/supabase';
import { meghatalmazasAdosMapping } from '../config/pdfMappings';

/**
 * pdf-lib WinAnsiEncoding workaround: 
 * A beépített betűtípusok nem támogatják az 'ő' és 'ű' karaktereket, 
 * ezért ezeket 'ö' és 'ü'-re cseréljük a PDF error elkerülése végett.
 */
function sanitizeHungarianString(text: string): string {
  if (!text) return text;
  return text
    .replace(/ő/g, 'ö')
    .replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü')
    .replace(/Ű/g, 'Ü');
}

/**
 * 💡 SEGÉDLET FEJLESZTŐKNEK: MEZŐNEVEK KINYERÉSE
 * 
 * Mielőtt az adatok mapelését megírnád, tudnod kell, milyen pontos neveken
 * szerepelnek az űrlapmezők a hivatalos MFB / állami PDF-ben (AcroForm).
 * Ezt a függvényt hívd meg konzolból vagy gombnyomásra egy teszt alatt, 
 * és kiírja a letöltött PDF összes belső mezőjét és típusát.
 */
export async function extractAndLogPdfFields(templateName: string): Promise<void> {
  try {
    const url = `/pdf-templates/${templateName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Nem találtam a template fájlt: ${url}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.group(`📄 PDF Mezők (Field Names) - ${templateName}`);
    fields.forEach(field => {
      const type = field.constructor.name;
      const name = field.getName();
      console.log(`[${type}]: "${name}"`);
    });
    console.groupEnd();
  } catch (error) {
    console.error("Hiba a PDF mezők kinyerésekor:", error);
  }
}

export interface PdfDataMapping {
  // A kulcsnak PONTOSAN egyeznie kell a PDF-ben definiált Field névvel.
  [fieldName: string]: string | boolean; 
}

/**
 * Hivatalos űrlapot tölt ki adatokkal, laposítja (szerkeszthetetlenné teszi), 
 * feltölti a Supabase Storage-ba, és regisztrálja a db-ben.
 * 
 * @param templateName A fájl neve a public/pdf-templates/ mappában (pl. "Meghatalmazas.pdf")
 * @param data Objektum a kitöltendő mezőkkel és értékekkel
 * @param projectId A projekt ID-ja amihez csatoljuk
 * @param fileName Milyen néven mentsük el (pl. "Kovacs_Janos_Meghatalmazas.pdf")
 */
export async function generateAndUploadOfficialDocument(
  templateName: string, 
  data: PdfDataMapping,
  projectId: string,
  fileName: string
): Promise<{ url?: string; blob?: Blob; error?: any }> {
  try {
    // 1. Sablon betöltése a frontend public/pdf-templates/ mappájából
    const templatePath = `/pdf-templates/${templateName}`;
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`Hiba a sablon letöltésekor: ${response.statusText}`);
    
    const existingPdfBytes = await response.arrayBuffer();

    // 2. PDF és Űrlap inicializálása
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();

    const fields = form.getFields();

    // 3. Adatok beillesztése dinamikusan (Index-alapú kitöltés)
    for (const [key, value] of Object.entries(data)) {
      try {
        const index = parseInt(key, 10);
        if (isNaN(index) || index < 0 || index >= fields.length) {
           console.warn(`Érvénytelen vagy hatókörön kívüli index a PDF-ben: "${key}"`);
           continue;
        }

        const field = fields[index];

        // Megvizsgáljuk a típust, majd aszerint töltjük fel
        if (field instanceof PDFTextField && typeof value === 'string') {
          field.setText(sanitizeHungarianString(value));
        } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
          if (value) field.check();
          else field.uncheck();
        } else {
          console.warn(`Nem támogatott típus illeszkedés a(z) ${index}. mezőnél.`);
        }
      } catch (err) {
        console.warn(`Hiba a(z) "${key}" indexű mező kitöltésekor:`, err);
      }
    }

    // 4. Űrlap laposítása ("Flatten") - Ez beégeti az adatokat és megszünteti az interaktív AcroForm mezőket
    form.flatten();

    // 5. Módosított dokumentum (bináris) legenerálása
    const pdfBytes = await pdfDoc.save();

    // 6. Kliens oldali közvetlen letöltéshez generálunk egy Blob-ot
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return {
      blob: blob
    };

  } catch (error) {
    console.error("Dokumentum generálási hiba:", error);
    return { error };
  }
}

/**
 * PÉLDA IMPLEMENTÁCIÓ A UI-hoz (Pl: ClientDetails.tsx részére)
 * =======================================================================
 * 
 * import { extractAndLogPdfFields, generateAndUploadOfficialDocument } from '../services/pdfService';
 * 
 * const handleGenerateMeghatalmazas = async (project) => {
 * 
 *   // 1. FEJLESZTÉS: Mezősnevek kinyerése
 *   // Ezt csak fejlesztés közben hívd, logolja a konzolra mik a mezők:
 *   // await extractAndLogPdfFields('meghatalmazas_sablon.pdf');
 * 
 *   // 2. MAPPING: Rakd össze a változókat
 *   // A bal oldalon az Acroform stringjei, a jobb oldalon a te state/database adataid
 *   const pdfData = {
 *      'Szerződő Neve': project.clientName,
 *      'Szerződés kelte': new Date().toLocaleDateString('hu-HU'),
 *      // 'Elfogadom a feltételeket': true, (Checkbox-ok esetén)
 *   };
 *   
 *   // 3. GENERÁLÁS ÉS MENTÉS
 *   const result = await generateAndUploadOfficialDocument(
 *       'meghatalmazas_sablon.pdf',    // Keresd itt: public/pdf-templates/...
 *       pdfData, 
 *       project.id, 
 *       `${project.clientName}_Meghatalmazas.pdf`
 *   );
 * 
 *   // 4. KÖZVETLEN LETÖLTÉS INDÍTÁSA
 *   if (result.blob) {
 *      const url = window.URL.createObjectURL(result.blob);
 *      const link = document.createElement('a');
 *      link.href = url;
 *      link.download = `${project.clientName}_Meghatalmazas.pdf`;
 *      link.click();
 *      window.URL.revokeObjectURL(url);
 *   } else if (result.error) {
 *      alert("Mentés sikertelen!");
 *   }
 * }
 */

/**
 * HIVATALOS MFB PDF DOKUMENTUMOK GENERÁLÁSA
 * Összegyűjti az összes szükséges adatot az adatbázisból (Supabase), majd
 * lemapeli az AcroForm mezőkre a pdfMappings.ts fájl segítségével.
 */
export async function generateProjectDocuments(projectId: string) {
  try {
    // 1. Projekt és Ügyfél Adatok letöltése
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*, clients(*)')
      .eq('id', projectId)
      .single();

    if (projectError) throw projectError;
    if (!projectData || !projectData.clients) throw new Error("A projekt vagy az ügyfél nem található.");

    const client = projectData.clients;
    // Megpróbáljuk kinyerni az adatokat a meglévő strukúrából, ha Array akkor az első elemet vesszük
    const clientRecord = Array.isArray(client) ? client[0] : client;

    // 2. Belső Adatstruktúra ("Source Data") összeállítása
    const safeBirthPlace = clientRecord.birth_place || '';
    const safeBirthDate = clientRecord.birth_date || '';
    
    // Csak azt fűzzük össze ami megvan, ha egyik sincs akkor üres string
    const birthPlaceAndDate = (safeBirthPlace ? safeBirthPlace + ', ' : '') + safeBirthDate;

    // Cím darabok összefűzése undefined mentesen
    const fullAddress = [
      clientRecord.postal_code, 
      clientRecord.city, 
      clientRecord.street, 
      clientRecord.house_number
    ].filter(Boolean).join(' ');

    const formattedDate = new Intl.DateTimeFormat('hu-HU', { 
         year: 'numeric', 
         month: '2-digit', 
         day: '2-digit' 
    }).format(new Date());

    const sourceData: Record<string, any> = {
      clientName: clientRecord.name || '',
      clientBirthName: clientRecord.birth_name || '',
      clientBirthPlaceAndDate: birthPlaceAndDate || '',
      clientMotherName: clientRecord.mothers_name || '',
      clientAddress: fullAddress || '',
      clientTaxNumber: clientRecord.tax_id || '',
      creationCity: '', // Egyelőre üresen hagyjuk a várost
      creationDate: formattedDate,
      emptyField: ''
    };

    // 3. Adatok Lemapelése a PDF form field-jeire a mapping objektum alapján
    const pdfDataToFill: PdfDataMapping = {};
    for (const [pdfField, internalKey] of Object.entries(meghatalmazasAdosMapping)) {
      if (sourceData[internalKey] !== undefined) {
         pdfDataToFill[pdfField] = sourceData[internalKey];
      } else {
         // Tesztelés alatt hagyjuk üresen vagy jelezzük valahogy
         pdfDataToFill[pdfField] = ''; 
      }
    }

    // 4. A PDF Generáló Core Hívása (Egyelőre a Meghatalmazás_KEHOP-ra példaként)
    const templateName = 'ML104U-Megbizott-penzugyi-tanacsado-meghatalmazasa_KEHOP.pdf';
    const safeClientName = clientRecord.name.replace(/[^a-zA-Z0-9]/g, '_');
    const result = await generateAndUploadOfficialDocument(
      templateName,
      pdfDataToFill,
      projectId,
      `Hivatalos_MFB_Meghatalmazas_${safeClientName}.pdf`
    );

    if (result.error) throw result.error;
    
    return { success: true, url: result.url, blob: result.blob };

  } catch (error) {
    console.error("Hiba a projekt hivatalos generálása során:", error);
    return { success: false, error };
  }
}

/**
 * 🛠️ PDF DEBUG TÉRKÉP GENERÁLÓ 
 * Létrehoz egy letölthető fájlt, ahol minden AcroForm text field-be 
 * beírja a saját indexét, így vizuálisan megtalálhatjuk, hogy melyik
 * mező hányas sorszámon van a hivatalos PDF-ben.
 */
export async function generateDebugPdf(templateName: string): Promise<{ blob?: Blob; error?: any }> {
  try {
    const templatePath = `/pdf-templates/${templateName}`;
    const response = await fetch(templatePath);
    if (!response.ok) throw new Error(`Hiba a sablon letöltésekor: ${response.statusText}`);
    
    const existingPdfBytes = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    fields.forEach((field, index) => {
      try {
        if (field instanceof PDFTextField) {
          field.setText(`MEZO_${index}`);
        }
        // Checkbox-okat szándékosan átugorjuk a try-catch segítségével (asetText-től elszállna ha az)
      } catch (err) {
        // Néma továbbítás
      }
    });

    // NEM LAPOSÍTJUK (flatten), hogy az eredményként beolvasott PDF-ben kijelölhető/vizsgálható legyen
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    return { blob };
  } catch (error) {
    console.error("Hiba a debug PDF generálásakor:", error);
    return { error };
  }
}


