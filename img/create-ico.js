/**
 * Erstellt img/logo.ico – ein 32×32 cashfinch-Icon (Farbverlauf: Teal → Dunkelblau).
 * Reines Node.js, keine Abhängigkeiten.
 * Wird von install.bat automatisch aufgerufen.
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const SIZE   = 32;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 0.5;

/* Pixel-Daten aufbauen (BGRA, top-down) */
const rows = [];
for (let y = 0; y < SIZE; y++) {
  const row = Buffer.alloc(SIZE * 4);
  for (let x = 0; x < SIZE; x++) {
    const dx   = x - CENTER + 0.5;
    const dy   = y - CENTER + 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const i    = x * 4;

    if (dist <= RADIUS) {
      // Cashfinch-Farbverlauf: oben Teal (#28B6E0) → unten Dunkelblau (#0A3558)
      const t     = y / SIZE;
      const alpha = dist > RADIUS - 1.2 ? Math.round(255 * (RADIUS - dist) / 1.2) : 255;
      row[i + 0] = Math.round((1 - t) * 224 + t *  88);  // B
      row[i + 1] = Math.round((1 - t) * 182 + t *  53);  // G
      row[i + 2] = Math.round((1 - t) *  40 + t *  10);  // R
      row[i + 3] = alpha;
    }
    // Außerhalb des Kreises → BGRA = 0 (transparent)
  }
  rows.push(row);
}

/* BMP-Pixeldaten sind bottom-up */
const xorMask = Buffer.concat(rows.slice().reverse());

/* AND-Maske: 1 Bit pro Pixel, padded auf 4-Byte-Zeilen */
const rowBytes = Math.ceil(SIZE / 32) * 4;  // = 4 Bytes pro Zeile für 32px
const andMask  = Buffer.alloc(SIZE * rowBytes);   // alle 0 → Alpha-Kanal entscheidet

/* BITMAPINFOHEADER */
const bmpHdr = Buffer.alloc(40);
bmpHdr.writeUInt32LE(40,        0);   // biSize
bmpHdr.writeInt32LE(SIZE,       4);   // biWidth
bmpHdr.writeInt32LE(SIZE * 2,   8);   // biHeight (×2 = XOR + AND mask)
bmpHdr.writeUInt16LE(1,        12);   // biPlanes
bmpHdr.writeUInt16LE(32,       14);   // biBitCount
bmpHdr.writeUInt32LE(0,        16);   // biCompression (BI_RGB)

const imageData = Buffer.concat([bmpHdr, xorMask, andMask]);

/* ICO-Datei zusammenbauen */
const iconDir = Buffer.alloc(6);
iconDir.writeUInt16LE(0, 0);   // Reserved
iconDir.writeUInt16LE(1, 2);   // Type: 1 = ICO
iconDir.writeUInt16LE(1, 4);   // Anzahl Bilder

const entry = Buffer.alloc(16);
entry.writeUInt8(SIZE,              0);  // Breite
entry.writeUInt8(SIZE,              1);  // Höhe
entry.writeUInt8(0,                 2);  // Farbanzahl (0 = kein Palette für 32bpp)
entry.writeUInt8(0,                 3);  // Reserved
entry.writeUInt16LE(1,              4);  // Planes
entry.writeUInt16LE(32,             6);  // Bit-Tiefe
entry.writeUInt32LE(imageData.length, 8);  // Größe der Bilddaten
entry.writeUInt32LE(22,            12);  // Offset (6 Header + 16 Entry)

const ico = Buffer.concat([iconDir, entry, imageData]);

const outPath = path.join(__dirname, 'logo.ico');
fs.writeFileSync(outPath, ico);
console.log('  logo.ico erstellt.');
