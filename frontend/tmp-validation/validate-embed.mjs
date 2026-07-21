import fs from 'node:fs';
import { jsPDF } from 'jspdf';

const src = fs.readFileSync('./src/quotation-logo.ts', 'utf8');
const m = src.match(/'([\s\S]*)'/);
const b64 = m ? m[1].trim() : '';
const clean = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').replace(/\s+/g, '');
const doc = new jsPDF({ unit: 'pt', format: 'a4' });
let ok = true;
try {
  doc.addImage(`data:image/jpeg;base64,${clean}`, 'JPEG', 430, 14, 150, 56);
} catch {
  ok = false;
}
const out = Buffer.from(doc.output('arraybuffer')).toString('latin1');
console.log(JSON.stringify({
  addImageOk: ok,
  hasImageObject: out.includes('/Subtype /Image'),
  hasJpegStream: out.includes('/DCTDecode')
}, null, 2));
