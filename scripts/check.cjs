const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const sources = ['navigation.js', 'playwright.config.cjs', 'playwright.fonts.config.cjs'];
for (const directory of ['scripts', 'tests']) {
  sources.push(...fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.cjs')).map(file => `${directory}/${file}`));
}
for (const source of sources) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, source)], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const file of require('./site-files.cjs')) fs.accessSync(path.join(root, file), fs.constants.R_OK);
console.log(`Sintassi verificata: ${sources.length} file JavaScript; asset del sito presenti.`);
