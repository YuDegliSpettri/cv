const { test: base, expect } = require('@playwright/test');

const test = base.extend({
  fontMode: ['local', { option: true }],
  allowCspViolations: [false, { option: true }],
  externalRequests: async ({}, use) => { await use([]); },
  cspViolations: async ({}, use) => { await use([]); },
  page: async ({ page, baseURL, fontMode, externalRequests, cspViolations, allowCspViolations }, use, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('__cvRecordCspViolation', violation => cspViolations.push(violation));
    await page.addInitScript(() => {
      window.__cvCspReports = [];
      document.addEventListener('securitypolicyviolation', event => {
        window.__cvCspReports.push(window.__cvRecordCspViolation({
          directive: event.effectiveDirective, blockedURI: event.blockedURI, disposition: event.disposition
        }));
      });
    });
    await page.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).origin !== new URL(baseURL).origin) {
        externalRequests.push(request.url());
        return route.abort('blockedbyclient');
      }
      if (fontMode === 'fallback' && request.resourceType() === 'font') return route.abort('blockedbyclient');
      return route.continue();
    });
    await use(page);
    await page.evaluate(() => Promise.all(window.__cvCspReports || []));
    if (externalRequests.length) await testInfo.attach('external-requests', { body: JSON.stringify(externalRequests, null, 2), contentType: 'application/json' });
    if (cspViolations.length) await testInfo.attach('csp-violations', { body: JSON.stringify(cspViolations, null, 2), contentType: 'application/json' });
    if (errors.length) await testInfo.attach('page-errors', { body: JSON.stringify(errors, null, 2), contentType: 'application/json' });
    expect(errors, 'No application pageerror').toEqual([]);
    if (!allowCspViolations) expect(cspViolations, 'No unexpected CSP violations').toEqual([]);
  }
});

module.exports = { test, expect };
