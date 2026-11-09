// Сайт + приём заказа: ZIP с фото пересылается в Telegram через бота.
// Запуск: BOT_TOKEN=... CHAT_ID=... node server.js  (Node 18+, без зависимостей)
import http from 'node:http';
import { readFile } from 'node:fs/promises';

const { BOT_TOKEN, CHAT_ID, PORT = 3000 } = process.env;
if (!BOT_TOKEN || !CHAT_ID) { console.error('Задайте BOT_TOKEN и CHAT_ID'); process.exit(1); }
const MAX = 45 * 1024 * 1024; // лимит Telegram для ботов: 50 МБ

http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await readFile(new URL('./index.html', import.meta.url)));
    }
    if (req.method === 'POST' && req.url === '/api/order') {
      const chunks = []; let size = 0;
      for await (const c of req) {
        size += c.length;
        if (size > MAX) { res.writeHead(413); return res.end('too large'); }
        chunks.push(c);
      }
      const info = JSON.parse(decodeURIComponent(req.headers['x-order'] || '%7B%7D'));
      const fd = new FormData();
      fd.append('chat_id', CHAT_ID);
      fd.append('caption', String(info.text || 'Нове замовлення').slice(0, 1000));
      fd.append('document', new Blob([Buffer.concat(chunks)], { type: 'application/zip' }), 'zamovlennya-foto.zip');
      const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end('{"ok":true}');
    }
    res.writeHead(404); res.end();
  } catch (e) {
    console.error(e); res.writeHead(500); res.end('error');
  }
}).listen(PORT, () => console.log('Слухаю порт ' + PORT));
