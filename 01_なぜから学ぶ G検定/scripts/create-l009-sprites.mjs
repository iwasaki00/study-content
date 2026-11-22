import fs from "node:fs";
import { deflateSync } from "node:zlib";
// Original 16px sprite artwork. These rows create the PNG only; the app NEVER imports them.
// Runtime numeric data is read back from the real PNG through Canvas.
const palette = {
  g: [136, 155, 112, 255],
  d: [59, 45, 31, 255],
  o: [221, 152, 70, 255],
  s: [162, 108, 55, 255],
  c: [248, 226, 180, 255],
  p: [220, 139, 116, 255],
  e: [35, 32, 27, 255],
  w: [255, 248, 226, 255],
  b: [188, 143, 90, 255],
};
const cat = [
  "gggggggggggggggg",
  "ggdggggggggggdgg",
  "ggddggggggggddgg",
  "ggdpdggggggdpdgg",
  "ggdooddddddoosgg",
  "gdoooosooosoosdg",
  "gdoooosooosoosdg",
  "dooooooooosssssd",
  "dooeeoooooeeossd",
  "dooweoocccweossd",
  "doooocccpcccsssd",
  "gdccccccecccccdg",
  "gdoccccccccccsdg",
  "ggdoccccccccsdgg",
  "gggddddddddddggg",
  "gggggggggggggggg",
];
const dog = [
  "gggggggggggggggg",
  "ggggddddddddgggg",
  "ggddbbbbbbbbddgg",
  "gdbbbccccccbbbdg",
  "gdbbbccccccbbbdg",
  "dbbbbccccccbbbbd",
  "dbbbecceeccbbbbd",
  "dbbbwccewccbbbbd",
  "dbbccccccccccbbd",
  "dbbcccceeecccbbd",
  "gdbcccceeeccbdgg",
  "gdbcccccecccbdgg",
  "ggdbccccpccbdggg",
  "gggdbcccpccbdggg",
  "ggggddddddddgggg",
  "gggggggggggggggg",
];
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type),
    len = Buffer.alloc(4),
    checksum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, checksum]);
}
function png(rows) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16))
    throw Error("Artwork must be exactly 16x16");
  const raw = Buffer.alloc(16 * (1 + 16 * 4));
  rows.forEach((r, y) => {
    raw[y * 65] = 0;
    [...r].forEach((key, x) =>
      Buffer.from(palette[key]).copy(raw, y * 65 + 1 + x * 4),
    );
  });
  const head = Buffer.alloc(13);
  head.writeUInt32BE(16, 0);
  head.writeUInt32BE(16, 4);
  head[8] = 8;
  head[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", head),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
for (const [name, rows] of [
  ["cat", cat],
  ["dog", dog],
])
  fs.writeFileSync("public/illustrations/l009/" + name + "-16.png", png(rows));
console.log("Created two original, exact 16x16 RGBA PNGs.");
