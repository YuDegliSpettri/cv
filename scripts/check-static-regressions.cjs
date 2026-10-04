const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const files = require('./site-files.cjs');

const root = path.resolve(__dirname, '..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-static-'));
const destination = path.join(root, 'test-results', 'static');
const summary = { results: [] };
function change(file, from, to) {
  const target = path.join(temporary, file);
  const original = fs.readFileSync(target, 'utf8');
  assert(original.includes(from), `Fixture target missing: ${file}: ${from}`);
  fs.writeFileSync(target, original.replace(from, to));
}
const cases = [
  {
    name: 'frammento-mancante',
    mutate: () => change('index.html', 'href="#profilo"', 'href="#destinazione-assente"'),
    diagnostic: /FRAGMENT_TARGET.*destinazione-assente/
  },
  {
    name: 'id-duplicato',
    mutate: () => change('index.html', '</main>', '<div id="profilo"></div></main>'),
    diagnostic: /ID_DUPLICATE.*profilo/
  },
  {
    name: 'riferimento-aria',
    mutate: () =>
      change('index.html', 'aria-labelledby="profilo-titolo"', 'aria-labelledby="titolo-assente"'),
    diagnostic: /ID_REFERENCE.*titolo-assente/
  },
  {
    name: 'asset-rinominato',
    mutate: () =>
      fs.renameSync(path.join(temporary, 'favicon.svg'), path.join(temporary, 'favicon-old.svg')),
    diagnostic: /favicon.svg: ASSET_MISSING/
  },
  {
    name: 'html-nesting',
    mutate: () =>
      change('index.html', '</main>', '<ul><div>Elemento non ammesso</div></ul></main>'),
    diagnostic: /HTML_INVALID[\s\S]*element-permitted-content/
  },
  {
    name: 'css-proprieta',
    mutate: () => change('styles.css', ':root {', ':root {\n  colour: red;'),
    diagnostic: /CSS_INVALID.*property-no-unknown/
  },
  {
    name: 'js-globale',
    mutate: () => fs.appendFileSync(path.join(temporary, 'navigation.js'), '\nmissingGlobal();\n'),
    diagnostic: /JS_INVALID no-undef.*missingGlobal/
  },
  {
    name: 'formato',
    mutate: () => change('index.html', '\n  <head>', '\n<head>'),
    diagnostic: /index.html: FORMAT_INVALID/
  },
  {
    name: 'nome-landmark',
    mutate: () =>
      change('index.html', 'class="index" aria-label="Indice del curriculum"', 'class="index"'),
    diagnostic: /HTML_INVALID[\s\S]*unique-landmark/
  },
  {
    name: 'etichetta-generica',
    mutate: () =>
      change('index.html', 'class="profile-facts" role="group"', 'class="profile-facts"'),
    diagnostic: /HTML_INVALID[\s\S]*aria-label-misuse/
  }
];
function reset() {
  fs.rmSync(temporary, { recursive: true, force: true });
  for (const file of files) {
    fs.mkdirSync(path.dirname(path.join(temporary, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(temporary, file));
  }
}
function check() {
  const result = spawnSync(process.execPath, [path.join(__dirname, 'check.cjs')], {
    cwd: root,
    env: { ...process.env, CV_CHECK_ROOT: temporary },
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024
  });
  if (result.error) throw result.error;
  return result;
}
try {
  fs.mkdirSync(destination, { recursive: true });
  reset();
  const baseline = check();
  assert.equal(baseline.status, 0, `Unmodified site must pass: ${baseline.stderr}`);
  for (const scenario of cases) {
    reset();
    scenario.mutate();
    const result = check();
    fs.writeFileSync(path.join(destination, `${scenario.name}.txt`), result.stdout + result.stderr);
    assert.equal(result.status, 1, `${scenario.name}: mutated site must fail`);
    assert.match(
      result.stderr,
      scenario.diagnostic,
      `${scenario.name}: specific diagnostic required`
    );
    summary.results.push({
      case: scenario.name,
      expectedFailureReproduced: true,
      exitCode: result.status
    });
    console.log(`${scenario.name}: difetto rilevato, exit code ${result.status}`);
  }
  fs.writeFileSync(path.join(destination, 'summary.json'), JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
