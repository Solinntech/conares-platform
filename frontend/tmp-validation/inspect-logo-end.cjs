const fs = require('fs');
const src = fs.readFileSync('./src/quotation-logo.ts', 'utf8');
const m = src.match(/'([\s\S]*)'/);
const b64 = m ? m[1].trim() : '';
const clean = b64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').replace(/\s+/g, '');
const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4);
const buf = Buffer.from(padded, 'base64');
const start = buf.subarray(0, 8).toString('hex');
const end = buf.subarray(buf.length - 8).toString('hex');
console.log(JSON.stringify({
  origChars: clean.length,
  paddedChars: padded.length,
  endMarkerJpeg: end.endsWith('ffd9'),
  start,
  end
}, null, 2));
