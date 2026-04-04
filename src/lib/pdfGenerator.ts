import { jsPDF } from 'jspdf';

export interface ClientPDFData {
  clientName: string;
  coDebtorName?: string;
  projectNotes?: string;
  investmentItems?: string[];
  owners?: { name: string, share: string, address: string }[];
  existingLoans?: { bank: string, amount: string, monthly: string }[];
}

// Segédfüggvény: a jsPDF standard betűtípusa (Helvetica/WinAnsi) nem ismeri
// az ő és ű betűket, így azokat ö és ü betűkre cseréljük a hibák elkerülése végett.
const hu = (text: string) => {
  if (!text) return '';
  return text
    .replace(/ő/g, 'ö').replace(/Ő/g, 'Ö')
    .replace(/ű/g, 'ü').replace(/Ű/g, 'Ü');
};

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `Kelt: ................................, ${year}. év ${month}. hó ${day}. nap`;
};

export const generateMeghatalmazas = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  // A specifikáció 4 példányt ír elő egyetlen dokumentumban az adós (és adóstárs) számára
  for (let i = 0; i < 4; i++) {
    if (i > 0) doc.addPage();
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(hu("MEGHATALMAZÁS"), 105, 30, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const text = hu(`
Alulírott ${data.clientName || '_______________'} 
${data.coDebtorName && data.coDebtorName !== '-' ? `és adóstársa ${data.coDebtorName}` : ''} 

meghatalmazom a konzorciumot és annak munkatársait, hogy a(z) 
${data.projectNotes || "Energetikai projekt"} ügyében teljeskörűen eljárjanak 
helyettem a hatóságok előtt.

Jelen meghatalmazás visszavonásig érvényes.
    `);
    
    doc.text(text, 20, 50);
    
    doc.text(hu(getTodayString()), 20, 150);
    doc.text(hu(".........................................."), 30, 180);
    doc.text(hu("Meghatalmazó (Ügyfél)"), 40, 190);
    doc.setFontSize(10);
    doc.text(hu(`${i + 1}. példány`), 105, 280, { align: "center" });
  }

  return doc.output('blob');
};

export const generateNyilatkozat = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("ADATKEZELÉSI NYILATKOZAT"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const text = hu(`
Alulírott ${data.clientName || '_______________'} kijelentem, 
hogy kifejezetten hozzájárulok személyes adataim kezeléséhez az alábbi célokból:
  
- Hitelügyintézés és hitelezéshez kapcsolódó adminisztráció
- Energetikai tanúsítványok (HET) beszerzése és véglegesítése
- Pályázati dokumentáció benyújtása és folyamatos követése

Tudomásul veszem, hogy adataimat az aktuális GDPR rendeletek 
szerint bizalmasan kezelik és felhatalmazás nélkül harmadik félnek
nem adják át.
  `);
  
  doc.text(text, 20, 50);
  
  doc.text(hu(getTodayString()), 20, 150);
  doc.text(hu(".........................................."), 30, 180);
  doc.text(hu("Nyilatkozatot tevő (Ügyfél)"), 40, 190);

  return doc.output('blob');
};

export const generateOsszefoglaloNyilatkozat = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("ÖSSZEFOGLALÓ NYILATKOZAT"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  doc.text(hu(`Ügyfél neve: ${data.clientName || '_______________'}`), 20, 50);
  doc.text(hu(`Kiválasztott Beruházási Elemek Listája:`), 20, 65);
  
  const items = data.investmentItems || [];
  let currentY = 75;
  
  if (items.length === 0) {
    doc.text(hu("- Nincs rögzítve beruházási elem a projekthez."), 25, currentY);
  } else {
    items.forEach(item => {
      let label = item;
      if (item === 'hoszigeteles') label = 'Hőszigetelés (homlokzati, födém)';
      if (item === 'nyilaszaro_csere') label = 'Nyílászáró csere (ablak, ajtó)';
      if (item === 'futeskorszerusites') label = 'Fűtéskorszerűsítés (hőszivattyú, kazán)';
      if (item === 'hmv_modernizalas') label = 'Használati melegvíz rendszer modernizálása';
      if (item === 'napelemes_rendszer') label = 'Napelemes rendszer telepítése';
      
      doc.text(hu(`- ${label}`), 25, currentY);
      currentY += 10;
    });
  }

  doc.text(hu("Alulírott kijelentem, hogy a fenti lista a valóságnak és szándékomnak"), 20, currentY + 20);
  doc.text(hu("megfelel, az abban foglalt munkálatokat megrendelem."), 20, currentY + 28);
  
  doc.text(hu(getTodayString()), 20, 220);
  doc.text(hu(".........................................."), 30, 250);
  doc.text(hu("Kivitelező vagy beruházó képviselője"), 30, 260);

  return doc.output('blob');
};

export const generateHorizontalis = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("HORIZONTÁLIS KÖVETELMÉNYEK IGAZOLÁSA"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  doc.text(hu(`Ügyfél neve: ${data.clientName || '_______________'}`), 20, 50);
  doc.text(hu("Minden pont esetén jelölni szükséges a megvalósulást (X-el érintettség esetén):"), 20, 65);
  
  const items = data.investmentItems || [];
  const allOptions = [
    { id: 'hoszigeteles', label: 'Épületszerkezeti hőszigetelés beépítve és leellenőrizve' },
    { id: 'nyilaszaro_csere', label: 'Megfelelő hőszigetelésű nyílászáró beépítve' },
    { id: 'futeskorszerusites', label: 'Fűtési rendszer hatékonysági tanúsítványa csatolva' },
    { id: 'hmv_modernizalas', label: 'Korszerű melegvíztároló berendezés telepítve' },
    { id: 'napelemes_rendszer', label: 'Szigetüzemű / hálózatra visszatápláló inverter működik' }
  ];
  
  let currentY = 85;
  
  // Custom font size for checkbox area
  doc.setFontSize(11);
  allOptions.forEach(opt => {
    const isChecked = items.includes(opt.id) ? "[ X ]" : "[   ]";
    doc.text(hu(`${isChecked}    ${opt.label}`), 25, currentY);
    currentY += 12;
  });

  doc.setFontSize(12);
  doc.text(hu("A kivitelezés során maradéktalanul betartották a specifikus"), 20, currentY + 20);
  doc.text(hu("követelményeket az érintett kiválasztott tevékenységek esetében."), 20, currentY + 28);
  
  doc.text(hu(getTodayString()), 20, 220);
  doc.text(hu(".........................................."), 30, 250);
  doc.text(hu("Műszaki Ellenőr / Szakértő"), 40, 260);

  return doc.output('blob');
};

export const generateTulajdonosiNyilatkozat = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("TÉNYLEGES TULAJDONOSI NYILATKOZAT"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const text = hu(`
Alulírott ${data.clientName || '_______________'} kijelentem, 
hogy az ingatlan, melyen a beruházás megvalósul, az alábbi tényleges 
tulajdonosi struktúrával rendelkezik az ingatlannyilvántartás alapján:
  `);
  doc.text(text, 20, 50);

  const owners = data.owners || [];
  let currentY = 85;
  
  if (owners.length === 0) {
    doc.text(hu("- Nincsenek rögzítve tulajdonosok."), 25, currentY);
  } else {
    owners.forEach((owner, idx) => {
      doc.text(hu(`${idx + 1}. Név: ${owner.name}`), 25, currentY);
      doc.text(hu(`   Tulajdoni hányad: ${owner.share}`), 25, currentY + 8);
      doc.text(hu(`   Cím / Hrsz: ${owner.address}`), 25, currentY + 16);
      currentY += 28;
    });
  }

  doc.text(hu(getTodayString()), 20, 220);
  doc.text(hu(".........................................."), 30, 250);
  doc.text(hu("Pályázó / Adós aláírása"), 40, 260);

  return doc.output('blob');
};

export const generateTulajdonosiHozzajarulas = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("TULAJDONOSI HOZZÁJÁRULÁS"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  doc.text(hu(`Mi, az érintett beruházással terhelt ingatlan tulajdonosai,
hozzájárulunk a ${data.projectNotes || "Energetikai projekt"} megvalósításához.`), 20, 50);

  const owners = data.owners || [];
  let currentY = 150;
  
  if (owners.length === 0) {
    doc.text(hu("Nincsenek rögzítve tulajdonosok."), 25, currentY);
  } else {
    // Dinamikus aláírási blokkok generálása a lap aljára
    owners.forEach((owner, idx) => {
      const offsetX = (idx % 2 === 0) ? 20 : 110;
      doc.text(hu("........................................"), offsetX, currentY);
      doc.text(hu(`${owner.name}`), offsetX + 5, currentY + 8);
      doc.text(hu(`Tulajdonos (${owner.share})`), offsetX + 5, currentY + 16);
      
      if (idx % 2 !== 0) currentY += 40;
    });
  }

  // Ensure every declaration has the date as requested
  doc.text(hu(getTodayString()), 20, 280);

  return doc.output('blob');
};

export const generatePepNyilatkozat = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(hu("KIEMELT KÖZSZEREPLŐI (PEP) NYILATKOZAT"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const text = hu(`
Alulírott ${data.clientName || '_______________'} (Pályázó)
büntetőjogi felelősségem tudatában kijelentem, hogy a pénzmosás és a 
terrorizmus finanszírozása megelőzéséről és megakadályozásáról szóló 
törvény (Pmt.) értelmében:

[ ] Kiemelt közszereplőnek minősülök.
[ X ] NEM minősülök kiemelt közszereplőnek.

Tudomásul veszem az adatszolgáltatási kötelezettségemet.
  `);
  
  doc.text(text, 20, 50);
  
  doc.text(hu(getTodayString()), 20, 150);
  doc.text(hu(".........................................."), 30, 180);
  doc.text(hu("Nyilatkozatot tevő (Ügyfél)"), 40, 190);

  return doc.output('blob');
};

export const generateKhrNyilatkozat = (data: ClientPDFData): Blob => {
  const doc = new jsPDF();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(hu("MEGLÉVŐ HITELEK (KHR) NYILATKOZAT"), 105, 30, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  
  const text = hu(`
Alulírott ${data.clientName || '_______________'} kijelentem, 
hogy a Központi Hitelinformációs Rendszerben (KHR) és megkötött 
hitelszerződéseim alapján az alábbi fennálló hiteltartozásokkal rendelkezem:
  `);
  doc.text(text, 20, 50);

  const loans = data.existingLoans || [];
  let currentY = 85;
  
  if (loans.length === 0) {
    doc.text(hu("- Nem rendelkezem jelenleg meglévő hitellel."), 25, currentY);
  } else {
    loans.forEach((loan, idx) => {
      doc.text(hu(`${idx + 1}. Bank / Hitelintézet: ${loan.bank}`), 25, currentY);
      doc.text(hu(`   Fennmaradt tőketartozás: ${loan.amount} Ft`), 25, currentY + 8);
      doc.text(hu(`   Havi törlesztőrészlet: ${loan.monthly} Ft/hó`), 25, currentY + 16);
      currentY += 28;
    });
  }

  doc.text(hu("Kijelentem, hogy a fenti adatok a valóságnak megfelelnek, fizetési"), 20, currentY + 20);
  doc.text(hu("hátralékom nincs."), 20, currentY + 28);
  
  doc.text(hu(getTodayString()), 20, 220);
  doc.text(hu(".........................................."), 30, 250);
  doc.text(hu("Pályázó / Adós aláírása"), 40, 260);

  return doc.output('blob');
};
