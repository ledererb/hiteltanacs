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
 * Általános nyilatkozatok (KHR, PEP, Tulajdonosi, stb) hardcoded kitöltése.
 * Széles körben összegyűjti az összes lehetséges PDF belső űrlapmező nevet, és lemapeli
 * azokat az egységes ügyfél adatokra.
 */
export function applyAllNyilatkozatFields(form: any, client: any) {
  const fields = form.getFields();
  
  fields.forEach((field: any) => {
    const fieldName = field.getName();
    
    if (field instanceof PDFTextField) {
      console.log(`[Nyilatkozat Mapping] Ellenőrzött mező: "${fieldName}"`);

      const birthPlace = client.birth_place || '';
      const birthDate = client.birth_date || '';
      const birthData = [birthPlace, birthDate].filter(Boolean).join(', ');
      
      const coDebtorBirthPlace = client.co_debtor_birth_place || '';
      const coDebtorBirthDate = client.co_debtor_birth_date || '';
      const coDebtorBirthData = [coDebtorBirthPlace, coDebtorBirthDate].filter(Boolean).join(', ');
      
      const fullAddress = client.address || client.full_address || '';

      switch (fieldName) {
        // --- NÉV ---
        case 'lulírott':
        case 'Családi és utónév_3':
        case 'Családi és utónév':
        case 'KI':
        case 'név':
        case 'HN':
          field.setText(sanitizeHungarianString(client.name || ''));
          break;
          
        // --- ADÓSTÁRS NEVE ---
        case 'Családi és utónév_2':
        case 'Név_2':
          field.setText(sanitizeHungarianString(client.co_debtor_name || client.co_debtor || ''));
          break;

        // --- SZÜLETÉSI NÉV ---
        case 'születési név':
        case 'Születési családi és utónév':
        case 'Születési név':
        case 'HSZN':
          field.setText(sanitizeHungarianString(client.birth_name || ''));
          break;

        // --- ADÓSTÁRS SZÜLETÉSI NÉV ---
        case 'Születési családi és utónév_2':
        case 'Születési név_2':
          field.setText(sanitizeHungarianString(client.co_debtor_birth_name || client.co_debtor_name || client.co_debtor || ''));
          break;

        // --- ANYJA NEVE ---
        case 'anyja születési neve':
        case 'nyja születési neve':
        case 'Anyja születési neve':
        case 'HAN':
          field.setText(sanitizeHungarianString(client.mothers_name || ''));
          break;

        // --- ADÓSTÁRS ANYJA NEVE ---
        case 'Anyja születési neve_2':
          field.setText(sanitizeHungarianString(client.co_debtor_mothers_name || ''));
          break;

        // --- SZÜLETÉSI HELY ÉS IDŐ EGYBEN ---
        case 'fill_4_2':
        case 'születés':
        case 'HSZH':
          field.setText(sanitizeHungarianString(birthData));
          break;

        // --- ADÓSTÁRS SZÜLETÉSI HELY ÉS IDŐ EGYBEN ---
        case 'Születési hely és idő_2':
          field.setText(sanitizeHungarianString(coDebtorBirthData));
          break;

        // --- SZÜLETÉSI HELY KÜLÖN ---
        case 'Születési hely_3':
        case 'Születési hely':
          field.setText(sanitizeHungarianString(client.birth_place || ''));
          break;

        // --- ADÓSTÁRS SZÜLETÉSI HELY KÜLÖN ---
        case 'Születési hely_2':
          field.setText(sanitizeHungarianString(client.co_debtor_birth_place || ''));
          break;

        // --- SZÜLETÉSI IDŐ KÜLÖN ---
        case 'fill_11_2':
        case 'fill_12':
          field.setText(sanitizeHungarianString(client.birth_date || ''));
          break;

        // --- LAKCÍM ---
        case 'állandó lakhely':
        case 'Lakcím4':
        case 'HÁL':
        case 'Kitöltő_lakcíme':
          field.setText(sanitizeHungarianString(fullAddress));
          break;

        // --- ADÓSTÁRS LAKCÍM ---
        case 'Lakcím4_2':
          field.setText(sanitizeHungarianString(client.co_debtor_address || ''));
          break;

        // --- IGAZOLVÁNY ---
        case 'személyi igazolvány száma':
          field.setText(sanitizeHungarianString(client.id_card_number || ''));
          break;

        // --- ÁLLAMPOLGÁRSÁG ---
        case 'Állampolgárság':
          field.setText(sanitizeHungarianString(client.nationality || 'Magyar'));
          break;
      }
    }
  });
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
export async function generateProjectDocuments(projectId: string, applicantType: 'ados' | 'adostars' = 'ados') {
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
    let sourceData: Record<string, any>;
    const formattedDate = new Intl.DateTimeFormat('hu-HU', { 
         year: 'numeric', 
         month: '2-digit', 
         day: '2-digit' 
    }).format(new Date());

    if (applicantType === 'ados') {
      const safeBirthPlace = clientRecord.birth_place || '';
      const safeBirthDate = clientRecord.birth_date || '';
      
      const birthPlaceAndDate = (safeBirthPlace ? safeBirthPlace + ', ' : '') + safeBirthDate;

      const fullAddressParts = [
        clientRecord.postal_code, 
        clientRecord.city, 
        clientRecord.street, 
        clientRecord.house_number
      ].filter(Boolean).join(' ');

      const fullAddress = clientRecord.full_address || fullAddressParts;

      sourceData = {
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
    } else {
      const safeBirthPlace = clientRecord.co_debtor_birth_place || '';
      const safeBirthDate = clientRecord.co_debtor_birth_date || '';
      const birthPlaceAndDate = (safeBirthPlace ? safeBirthPlace + ', ' : '') + safeBirthDate;

      sourceData = {
        clientName: clientRecord.co_debtor_name || clientRecord.co_client_name || '',
        clientBirthName: clientRecord.co_debtor_birth_name || '',
        clientBirthPlaceAndDate: birthPlaceAndDate || '',
        clientMotherName: clientRecord.co_debtor_mothers_name || '',
        clientAddress: clientRecord.co_debtor_address || clientRecord.co_client_address || '',
        clientTaxNumber: clientRecord.co_client_tax_id || '',
        creationCity: '',
        creationDate: formattedDate,
        emptyField: ''
      };
    }

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
    const safeClientName = (sourceData.clientName || 'ugyfel').replace(/[^a-zA-Z0-9]/g, '_');
    const suffix = applicantType === 'ados' ? "Ados" : "Adostars";
    const result = await generateAndUploadOfficialDocument(
      templateName,
      pdfDataToFill,
      projectId,
      `Hivatalos_MFB_Meghatalmazas_${suffix}_${safeClientName}.pdf`
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


