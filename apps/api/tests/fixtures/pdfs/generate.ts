/**
 * Generates the synthetic PDF fixtures used by the upload/validation tests.
 * All content is fictional. Never put real resume data here.
 *
 * Run: npm run fixtures:pdfs -w @tailorcv/api   (output is committed, so tests don't need this)
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
/** Fixed timestamp so regenerating produces byte-identical files (clean git diffs). */
const FIXED_DATE = new Date("2026-01-01T00:00:00Z");

const LETTER: [number, number] = [612, 792];

async function newDoc(title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("TailorCV test fixtures");
  doc.setProducer("tailorcv-fixtures");
  doc.setCreator("tailorcv-fixtures");
  doc.setCreationDate(FIXED_DATE);
  doc.setModificationDate(FIXED_DATE);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, font, bold };
}

function writeLines(
  page: PDFPage,
  lines: Array<[string, PDFFont, number]>,
  x: number,
  startY: number,
): void {
  let y = startY;
  for (const [text, font, size] of lines) {
    page.drawText(text, { x, y, size, font, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 6;
  }
}

async function save(doc: PDFDocument, name: string): Promise<void> {
  const bytes = await doc.save({ useObjectStreams: false });
  writeFileSync(join(OUT_DIR, name), bytes);
  console.log(`  ${name} (${bytes.length} bytes)`);
}

async function singleColumnResume(pages: 1 | 2, name: string): Promise<void> {
  const { doc, font, bold } = await newDoc(`Alex Example resume (${pages} page)`);
  const first = doc.addPage(LETTER);
  writeLines(
    first,
    [
      ["Alex Example", bold, 22],
      ["Senior Software Engineer · alex@example.com · Springfield", font, 10],
      ["", font, 6],
      ["EXPERIENCE", bold, 12],
      ["Acme Widgets Inc. — Senior Software Engineer (2021 – Present)", bold, 10],
      ["• Built a TypeScript order service handling 2M requests per day.", font, 10],
      ["• Cut page load time by 40% by moving rendering to the edge.", font, 10],
      ["Globex Corp — Software Engineer (2018 – 2021)", bold, 10],
      ["• Maintained React dashboards used by 300 internal analysts.", font, 10],
      ["", font, 6],
      ["EDUCATION", bold, 12],
      ["State University — B.Sc. Computer Science (2018)", font, 10],
      ["", font, 6],
      ["SKILLS", bold, 12],
      ["TypeScript, React, Node.js, PostgreSQL, AWS, Docker", font, 10],
    ],
    56,
    730,
  );
  if (pages === 2) {
    const second = doc.addPage(LETTER);
    writeLines(
      second,
      [
        ["PROJECTS", bold, 12],
        ["Open-source CSV toolkit — 1.2k GitHub stars", font, 10],
        ["", font, 6],
        ["CERTIFICATIONS", bold, 12],
        ["Example Cloud Practitioner (2023)", font, 10],
      ],
      56,
      730,
    );
  }
  await save(doc, name);
}

async function twoColumnResume(): Promise<void> {
  const { doc, font, bold } = await newDoc("Sam Sample resume (two columns)");
  const page = doc.addPage(LETTER);
  page.drawRectangle({ x: 0, y: 0, width: 190, height: 792, color: rgb(0.93, 0.95, 0.98) });
  writeLines(
    page,
    [
      ["Sam Sample", bold, 18],
      ["Data Analyst", font, 10],
      ["", font, 6],
      ["CONTACT", bold, 11],
      ["sam@example.com", font, 9],
      ["Shelbyville", font, 9],
      ["", font, 6],
      ["SKILLS", bold, 11],
      ["SQL", font, 9],
      ["Python", font, 9],
      ["Tableau", font, 9],
    ],
    24,
    740,
  );
  writeLines(
    page,
    [
      ["EXPERIENCE", bold, 12],
      ["Initech — Data Analyst (2022 – Present)", bold, 10],
      ["• Automated weekly KPI reports, saving 6 hours per week.", font, 10],
      ["• Built churn dashboards for the sales team.", font, 10],
      ["", font, 6],
      ["EDUCATION", bold, 12],
      ["City College — B.A. Economics (2021)", font, 10],
    ],
    214,
    740,
  );
  await save(doc, "resume-2column.pdf");
}

async function sevenPages(): Promise<void> {
  const { doc, font } = await newDoc("Seven page document");
  for (let i = 1; i <= 7; i++) {
    writeLines(doc.addPage(LETTER), [[`Page ${i} of 7 (synthetic filler)`, font, 12]], 56, 730);
  }
  await save(doc, "seven-pages.pdf");
}

/** A valid PDF that is clearly NOT a resume (for RESUME_NOT_DETECTED). */
async function invoice(): Promise<void> {
  const { doc, font, bold } = await newDoc("Invoice INV-1042");
  writeLines(
    doc.addPage(LETTER),
    [
      ["INVOICE #INV-1042", bold, 20],
      ["Example Supplies Ltd · 12 Market Street · Springfield", font, 10],
      ["Bill to: Initech Accounts Payable", font, 10],
      ["", font, 6],
      ["Item                     Qty     Unit price     Total", bold, 10],
      ["Printer paper (A4)        10        $4.50       $45.00", font, 10],
      ["Toner cartridge            2       $60.00      $120.00", font, 10],
      ["", font, 6],
      ["Subtotal $165.00 · Tax $13.20 · Total due $178.20", bold, 11],
      ["Payment due within 30 days. Thank you for your business.", font, 10],
    ],
    56,
    730,
  );
  await save(doc, "invoice.pdf");
}

/**
 * Hand-written PDF with a Standard security handler (/Encrypt, R2) whose /U entry does not match
 * the empty user password, so PDF readers ask for a password. No real encryption is needed for
 * that check, and it avoids a system dependency such as qpdf.
 */
function encryptedPdf(): void {
  const hex32 = (byte: string) => byte.repeat(32);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    `<< /Filter /Standard /V 1 /R 2 /O <${hex32("ab")}> /U <${hex32("cd")}> /P -44 >>`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  const id = "0123456789abcdef0123456789abcdef";
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Encrypt 4 0 R /ID [<${id}> <${id}>] >>\n`;
  body += `startxref\n${xrefOffset}\n%%EOF\n`;
  writeFileSync(join(OUT_DIR, "encrypted.pdf"), body, "latin1");
  console.log(`  encrypted.pdf (${Buffer.byteLength(body, "latin1")} bytes)`);
}

function nonPdfFiles(): void {
  // A PNG signature + junk, renamed to .pdf.
  writeFileSync(
    join(OUT_DIR, "not-a-pdf.pdf"),
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from("this is not a pdf"),
    ]),
  );
  writeFileSync(join(OUT_DIR, "empty.pdf"), Buffer.alloc(0));
  // Starts with the PDF magic bytes but is otherwise garbage.
  writeFileSync(join(OUT_DIR, "corrupt.pdf"), "%PDF-1.7\nthis file is truncated and broken");
  console.log("  not-a-pdf.pdf, empty.pdf, corrupt.pdf");
}

console.log(`Writing PDF fixtures to ${OUT_DIR}`);
await singleColumnResume(1, "resume-1page.pdf");
await singleColumnResume(2, "resume-2page.pdf");
await twoColumnResume();
await sevenPages();
await invoice();
encryptedPdf();
nonPdfFiles();
