const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../public');
const types = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
    '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm',
};

http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { res.writeHead(400).end(); return; }
    if (pathname === '/' || /^\/invite\/[^/]+\/?$/.test(pathname)) pathname = '/index.html';
    if (pathname === '/admin/rsvp') pathname = '/invitation.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.stat(file, (error, stat) => {
        if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
        const media = ['.mp3', '.ogg', '.wav', '.mp4'].includes(path.extname(file).toLowerCase());
        const headers = { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Referrer-Policy': 'no-referrer' };
        if (media) headers['Accept-Ranges'] = 'bytes';
        const match = media && typeof req.headers.range === 'string' && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (match) {
            const suffix = !match[1] && match[2];
            const start = suffix ? Math.max(0, stat.size - Number(match[2])) : Number(match[1]);
            const end = suffix ? stat.size - 1 : match[2] ? Math.min(stat.size - 1, Number(match[2])) : stat.size - 1;
            if (start >= stat.size || start > end) {
                res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` }).end();
                return;
            }
            res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
            if (req.method === 'HEAD') res.end();
            else fs.createReadStream(file, { start, end }).pipe(res);
            return;
        }
        res.writeHead(200, { ...headers, 'Content-Length': stat.size });
        if (req.method === 'HEAD') res.end();
        else fs.createReadStream(file).pipe(res);
    });
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Static preview: http://127.0.0.1:${process.env.PORT || 4173}`));
