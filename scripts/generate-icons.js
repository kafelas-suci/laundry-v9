import fs from 'fs';
import zlib from 'zlib';

function createPng(width, height, r, g, b) {
  // Standard PNG signature: 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (truecolor RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // CRC calculation
    let c = 0xffffffff;
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let curr = n;
      for (let k = 0; k < 8; k++) {
        curr = (curr & 1) ? (0xedb88320 ^ (curr >>> 1)) : (curr >>> 1);
      }
      crcTable[n] = curr;
    }
    for (let i = 4; i < 8 + len; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    buf.writeInt32BE((c ^ 0xffffffff) | 0, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image scanlines: filter byte 0 + RGB
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter none
    for (let x = 0; x < width; x++) {
      // Draw circular badge in center
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.42;
      const innerRadius = width * 0.28;

      if (dist < innerRadius) {
        // Inner cyan / water
        rawData[offset++] = 56;
        rawData[offset++] = 189;
        rawData[offset++] = 248;
      } else if (dist < radius) {
        // White washing machine frame
        rawData[offset++] = 255;
        rawData[offset++] = 255;
        rawData[offset++] = 255;
      } else {
        // Maroon background (#800000)
        rawData[offset++] = r;
        rawData[offset++] = g;
        rawData[offset++] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const p192 = createPng(192, 192, 128, 0, 0);
const p512 = createPng(512, 512, 128, 0, 0);
const appleIcon = createPng(180, 180, 128, 0, 0);

fs.writeFileSync('./public/pwa-192x192.png', p192);
fs.writeFileSync('./public/pwa-512x512.png', p512);
fs.writeFileSync('./public/pwa-maskable-512x512.png', p512);
fs.writeFileSync('./public/apple-touch-icon.png', appleIcon);
fs.writeFileSync('./public/favicon.ico', p192);

console.log('PNG Icons successfully generated!');
