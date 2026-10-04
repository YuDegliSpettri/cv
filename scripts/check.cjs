const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { HtmlValidate, formatterFactory } = require('html-validate');
const { ESLint } = require('eslint');
const stylelint = require('stylelint');
const prettier = require('prettier');
const files = require('./site-files.cjs');

const root = path.resolve(__dirname, '..');
const siteRoot = path.resolve(process.env.CV_CHECK_ROOT || root);

async function main() {
  const errors = [];
  const sources = fs.readdirSync(root).filter((file) => file.endsWith('.cjs'));
  for (const directory of ['scripts', 'tests']) {
    sources.push(
      ...fs
        .readdirSync(path.join(root, directory))
        .filter((file) => file.endsWith('.cjs'))
        .map((file) => `${directory}/${file}`)
    );
  }
  for (const source of sources) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, source)], {
      encoding: 'utf8'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) errors.push(`${source}: JS_SYNTAX ${result.stderr}`);
  }
  for (const file of files) {
    if (!fs.existsSync(path.join(siteRoot, file)))
      errors.push(`${file}: ASSET_MISSING file pubblicato assente`);
  }

  if (fs.existsSync(path.join(siteRoot, 'index.html'))) {
    const html = fs.readFileSync(path.join(siteRoot, 'index.html'), 'utf8');
    const validator = new HtmlValidate(require('../.htmlvalidate.json'));
    const report = await validator.validateString(html, 'index.html');
    if (!report.valid) errors.push(`HTML_INVALID\n${formatterFactory('text')(report.results)}`);

    const { parse } = await import('parse5');
    const document = parse(html, { sourceCodeLocationInfo: true });
    const elements = [];
    function visit(node) {
      if (node.tagName) elements.push(node);
      for (const child of node.childNodes || []) visit(child);
      if (node.content) visit(node.content);
    }
    visit(document);
    const ids = new Map();
    const attribute = (node, name) => node.attrs.find((item) => item.name === name)?.value;
    const errorAt = (node, code, message) =>
      errors.push(`index.html:${node.sourceCodeLocation?.startLine || 1}: ${code} ${message}`);
    for (const node of elements) {
      const id = attribute(node, 'id');
      if (!id) continue;
      if (ids.has(id)) errorAt(node, 'ID_DUPLICATE', `id="${id}" ripetuto`);
      ids.set(id, node);
    }
    const origin = 'https://yudeglispettri.github.io';
    const base = `${origin}/cv/`;
    for (const node of elements) {
      for (const name of [
        'aria-labelledby',
        'aria-describedby',
        'aria-controls',
        'aria-owns',
        'aria-flowto',
        'aria-activedescendant',
        'aria-details',
        'aria-errormessage',
        'headers',
        'for'
      ]) {
        for (const id of (attribute(node, name) || '').split(/\s+/).filter(Boolean)) {
          if (!ids.has(id)) errorAt(node, 'ID_REFERENCE', `${name}="${id}" non risolto`);
        }
      }
      for (const name of ['href', 'src']) {
        const value = attribute(node, name);
        if (!value) continue;
        const url = new URL(value, base);
        if (url.origin !== origin) continue;
        const local = decodeURIComponent(url.pathname).replace(/^\/cv\//, '') || 'index.html';
        if (
          ['/cv/', '/cv/index.html'].includes(url.pathname) &&
          url.hash &&
          !ids.has(decodeURIComponent(url.hash.slice(1)))
        ) {
          errorAt(node, 'FRAGMENT_TARGET', `destinazione "${url.hash}" assente`);
        }
        if (!files.includes(local)) {
          errorAt(node, 'ASSET_UNPUBLISHED', `risorsa "${value}" esclusa dal pacchetto`);
        } else if (!fs.existsSync(path.join(siteRoot, local))) {
          errorAt(node, 'ASSET_MISSING', `risorsa "${value}" assente`);
        }
      }
    }
  }
  if (fs.existsSync(path.join(siteRoot, 'styles.css'))) {
    const result = await stylelint.lint({
      code: fs.readFileSync(path.join(siteRoot, 'styles.css'), 'utf8'),
      codeFilename: path.join(root, 'styles.css'),
      configFile: path.join(root, 'stylelint.config.cjs')
    });
    for (const resultFile of result.results) {
      for (const warning of resultFile.warnings) {
        errors.push(`styles.css:${warning.line}:${warning.column}: CSS_INVALID ${warning.text}`);
      }
      if (resultFile.invalidOptionWarnings.length)
        throw new Error(JSON.stringify(resultFile.invalidOptionWarnings));
      if (resultFile.parseErrors.length)
        errors.push(`CSS_INVALID ${JSON.stringify(resultFile.parseErrors)}`);
    }
  }
  if (fs.existsSync(path.join(siteRoot, 'navigation.js'))) {
    const eslint = new ESLint({
      cwd: root,
      overrideConfigFile: path.join(root, 'eslint.config.cjs')
    });
    const results = await eslint.lintText(
      fs.readFileSync(path.join(siteRoot, 'navigation.js'), 'utf8'),
      { filePath: path.join(root, 'navigation.js') }
    );
    for (const result of results) {
      for (const message of result.messages) {
        errors.push(
          `navigation.js:${message.line}:${message.column}: JS_INVALID ${message.ruleId || 'syntax'} ${message.message}`
        );
      }
    }
  }
  for (const file of ['index.html', 'styles.css', 'navigation.js', 'favicon.svg']) {
    if (!fs.existsSync(path.join(siteRoot, file))) continue;
    try {
      const formatted = await prettier.check(fs.readFileSync(path.join(siteRoot, file), 'utf8'), {
        ...(await prettier.resolveConfig(path.join(root, file))),
        filepath: path.join(root, file)
      });
      if (!formatted) errors.push(`${file}: FORMAT_INVALID eseguire npm run format`);
    } catch (error) {
      errors.push(`${file}: FORMAT_INVALID ${error.message}`);
    }
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      `Controlli statici superati: HTML, riferimenti ID/frammenti/asset, CSS, JavaScript ES2020 e formato; ${files.length} asset presenti.`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
