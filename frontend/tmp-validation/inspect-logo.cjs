const fs = require('fs');
const src = fs.readFileSync('./src/quotation-logo.ts', 'utf8');
const m = src.match(/'([\s\S]*)'/);
const b64 = m ? m[1].trim() : '';
const clean = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').replace(/\s+/g, '');
const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
const buf = Buffer.from(padded, 'base64');
const sigStart = buf.subarray(0, 8).toString('hex');
const sigEnd = buf.subarray(Math.max(0, buf.length - 8)).toString('hex');
console.log(JSON.stringify({
  chars: clean.length,
  mod4: clean.length % 4,
  bytes: buf.length,
  start: sigStart,
  end: sigEnd,
  jpegStart: sigStart.startsWith('ffd8ff'),
  jpegEnd: sigEnd.endsWith('ffd9')
}, null, 2));
