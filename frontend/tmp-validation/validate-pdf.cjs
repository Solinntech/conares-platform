const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/quotations', { waitUntil: 'domcontentloaded' });

  const loginHeading = page.getByRole('heading', { name: 'Ingreso a la plataforma' });
  if (await loginHeading.count()) {
    await page.getByLabel('Usuario').fill('ADMIN');
    await page.getByLabel('Contraseña').fill('Conares2026*');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.waitForURL('**/quotations');
  }

  await page.waitForSelector('button:has-text("Descargar")');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar' }).first().click({ force: true })
  ]);

  const tempDir = path.join(process.cwd(), 'tmp-validation');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const targetPath = path.join(tempDir, 'quotation-validation.pdf');
  await download.saveAs(targetPath);

  const buffer = fs.readFileSync(targetPath);
  const pdfText = buffer.toString('latin1');

  const result = {
    downloadSuggestedFilename: download.suggestedFilename(),
    savedPath: targetPath,
    sizeBytes: buffer.length,
    hasPdfHeader: pdfText.includes('%PDF-'),
    hasImageObject: pdfText.includes('/Subtype /Image'),
    hasJpegStream: pdfText.includes('/DCTDecode')
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
