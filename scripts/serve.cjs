const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const files = require('./site-files.cjs');

const root = path.resolve(process.env.CV_SITE_ROOT || path.join(__dirname, '..'));
const port = Number(process.env.CV_TEST_PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('CV_TEST_PORT non valida');
const routes = new Map(files.map(file => [`/cv/${file}`, file]));
routes.set('/cv/', 'index.html');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

const server = http.createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
  }
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (pathname === '/' || pathname === '/cv') {
    response.writeHead(302, { Location: '/cv/' }); response.end(); return;
  }
  const file = routes.get(pathname);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const content = await fs.readFile(path.join(root, file));
    response.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end('Asset unavailable');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`CV: http://127.0.0.1:${port}/cv/`));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
