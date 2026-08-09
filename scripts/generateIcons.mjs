import fs from 'fs';
import zlib from 'zlib';

function createPngBuffer(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([139, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data with filter byte 0 at start of each line
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Draw a subtle border / center square
      const isBorder = x < 4 || x >= width - 4 || y < 4 || y >= height - 4;
      const isCenter = Math.abs(x - width / 2) < width / 4 && Math.abs(y - height / 2) < height / 4;
      if (isCenter) {
        rawData[pxOffset] = 0;     // R
        rawData[pxOffset + 1] = 240; // G
        rawData[pxOffset + 2] = 255; // B
      } else if (isBorder) {
        rawData[pxOffset] = 180;   // R
        rawData[pxOffset + 1] = 0;   // G
        rawData[pxOffset + 2] = 255; // B
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcVal = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) crc = (crc >>> 1) ^ 0xedb88320;
      else crc = crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

fs.writeFileSync('public/icon-192.png', createPngBuffer(192, 192, 3, 3, 5));
fs.writeFileSync('public/icon-512.png', createPngBuffer(512, 512, 3, 3, 5));
fs.writeFileSync('public/favicon.ico', createPngBuffer(32, 32, 3, 3, 5));
console.log('✅ Generated public/icon-192.png, public/icon-512.png, public/favicon.ico');
