const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const revision = '4e4f03962aa7abe2aff7644e80a3a3ff3b06c579';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-regressions-'));
const destination = path.join(root, 'test-results', 'regressions');
const cases = [
  { id: 'CP-01', grep: '\\[CP-01\\] offset auto', project: 'webkit', error: /rootMargin/ },
  { id: 'A11Y-01', grep: '\\[A11Y-01\\] testo 200% 768x1024', project: 'chromium', error: /overflow|outside viewport/ },
  { id: 'A11Y-02', grep: '\\[A11Y-02\\] spaziatura 320x568', project: 'chromium', error: /overflow|outside viewport/ },
  { id: 'CP-03', grep: '\\[CP-03\\] offset misurato', project: 'chromium', error: /CSS offset/ },
  { id: 'A11Y-03', grep: '\\[A11Y-03\\] stampa light', project: 'chromium', error: /Print contrast/ },
  { id: 'SEC-02-AUD-01', grep: '\\[SEC-02/AUD-01\\] font locali', project: 'chromium', error: /Requests must stay on site origin/ },
  { id: 'SEC-01', grep: '\\[SEC-01\\] blocco', project: 'chromium', error: /CSP must block external scripts/ }
];
const summary = { revision, results: [] };

try {
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  // This historical revision predates the local font assets.
  for (const file of ['index.html', 'styles.css', 'navigation.js', 'favicon.svg']) {
    fs.writeFileSync(path.join(temporary, file), execFileSync('git', ['show', `${revision}:${file}`], { cwd: root }));
  }
  for (const scenario of cases) {
    const output = path.join(destination, scenario.id);
    fs.mkdirSync(output, { recursive: true });
    const result = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--grep', scenario.grep, '--project', scenario.project, '--workers=1', '--reporter=json'], {
      cwd: root,
      env: { ...process.env, CV_SITE_ROOT: temporary, CV_TEST_OUTPUT_DIR: path.join(output, 'artifacts') },
      encoding: 'utf8', maxBuffer: 8 * 1024 * 1024
    });
    if (result.error) throw result.error;
    fs.writeFileSync(path.join(output, 'report.json'), result.stdout);
    if (result.stderr) fs.writeFileSync(path.join(output, 'stderr.txt'), result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(result.status, 1, `${scenario.id}: baseline must exit with test failure`);
    assert.equal(report.stats.unexpected, 1, `${scenario.id}: one selected test must fail`);
    assert(scenario.error.test(JSON.stringify(report.suites)), `${scenario.id}: expected finding must cause the failure`);
    summary.results.push({ finding: scenario.id, project: scenario.project, expectedFailureReproduced: true, exitCode: result.status });
    console.log(`${scenario.id}: difetto originale rilevato, exit code ${result.status}`);
  }
  fs.writeFileSync(path.join(destination, 'summary.json'), JSON.stringify(summary, null, 2));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
