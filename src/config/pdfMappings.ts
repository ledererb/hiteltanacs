/**
 * PDF Mappings a hivatalos MFB-s nyomtatványok kitöltéséhez
 * A kulcsok a PDF belső Field Name-jei (amiket le kell olvasni az AcroForm-ból),
 * az értékek pedig a belső (Supabase) adatszerkezet változónevei.
 */

// Placeholderek használatával, amíg nem tudjuk a pontos mezőneveket a PDF-ből.
export const meghatalmazasAdosMapping: Record<string, string> = {
  '0': 'clientName',
  '1': 'clientBirthName',
  '2': 'clientBirthPlaceAndDate',
  '3': 'clientMotherName',
  '4': 'clientAddress',
  '5': 'clientTaxNumber',
  '6': 'emptyField',
  '7': 'emptyField',
  '8': 'emptyField',
  '9': 'emptyField',
  '15': 'creationCity',
  '16': 'creationDate',
  '17': 'emptyField',
  '18': 'emptyField',
  '19': 'emptyField',
  '20': 'emptyField'
};

// Több űrlaphoz is felvehetőek új mapping objektumok
export const egyebHivatalosIratMapping: Record<string, string> = {
  'PDF_FIELD_MASIK_NEVE': 'clientName'
}
