// 開発確認用の静的配信。アプリ自体にはサーバー処理は不要。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
http.createServer((req, res) => {
  let name;
  try { name = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400).end(); return; }
  const file = path.resolve(__dirname, `.${name === '/' ? '/index.html' : name}`);
  if (!file.startsWith(__dirname + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, content) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  });
}).listen(8043, host, () => console.log(`ひらめき図形ラボ: http://127.0.0.1:8043/ ${host === '0.0.0.0' ? '（LAN接続も受付中）' : ''}`));
