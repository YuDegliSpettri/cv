const fs = require('node:fs');
const path = require('node:path');
const files = require('./site-files.cjs');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, '_site');
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination);
for (const file of files) {
  fs.mkdirSync(path.dirname(path.join(destination, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(destination, file));
}
console.log(`Pacchetto sito: ${files.length} asset in _site/`);
