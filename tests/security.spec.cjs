const { test, expect } = require('./fixtures.cjs');
const { openSite } = require('./helpers.cjs');

function probeUrl(baseURL, file) {
  const url = new URL(file, baseURL);
  // Same loopback server, different origin. Responses are controlled by the test.
  url.hostname = 'localhost';
  return url.href;
}

async function externalScript(page, url) {
  return page.evaluate(
    (url) =>
      new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve('loaded');
        script.onerror = () => resolve('blocked');
        document.body.append(script);
      }),
    url
  );
}

async function inlineScript(page) {
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__cvInlineProbe = true;';
    document.body.append(script);
  });
  return page.evaluate(() => window.__cvInlineProbe === true);
}

test.describe('CSP', () => {
  test.use({ allowCspViolations: true });

  test('[SEC-01] blocco nativo degli script esterni e inline', async ({
    page,
    baseURL,
    cspViolations
  }) => {
    const url = probeUrl(baseURL, '__csp_probe.js');
    let responses = 0;
    // Override the fixture's network filter only for this harmless probe.
    // Without CSP this response must load, so a harness abort cannot satisfy the test.
    await page.route(url, async (route) => {
      responses++;
      await route.fulfill({
        contentType: 'application/javascript',
        body: 'window.__cvExternalProbe = true;'
      });
    });
    await openSite(page);
    expect(await externalScript(page, url), 'CSP must block external scripts').toBe('blocked');
    expect(await page.evaluate(() => window.__cvExternalProbe === true)).toBe(false);
    expect(responses, 'CSP must prevent the external request before routing').toBe(0);
    expect(await inlineScript(page), 'CSP must block inline scripts').toBe(false);
    await expect
      .poll(
        () =>
          cspViolations.filter(
            (violation) =>
              violation.disposition === 'enforce' &&
              violation.directive.startsWith('script-src') &&
              [url, 'inline'].includes(violation.blockedURI)
          ).length
      )
      .toBe(2);
    expect(cspViolations, 'Only the two deliberate script probes may violate CSP').toHaveLength(2);
    const misplaced = await page.evaluate(() => {
      const policy = document.head.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return [...document.head.querySelectorAll('[src], [href]')]
        .filter(
          (resource) =>
            !policy ||
            !(policy.compareDocumentPosition(resource) & Node.DOCUMENT_POSITION_FOLLOWING)
        )
        .map((resource) => resource.outerHTML);
    });
    expect(misplaced, 'CSP must precede every site resource').toEqual([]);

    // Positive control: remove only CSP from a temporary response, then run the same probes.
    await page.route(baseURL, async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>\s*/i,
        ''
      );
      await route.fulfill({ response, body });
    });
    await openSite(page);
    expect(await externalScript(page, url), 'Probe transport must work without CSP').toBe('loaded');
    expect(await page.evaluate(() => window.__cvExternalProbe === true)).toBe(true);
    expect(await inlineScript(page), 'Inline probe must execute without CSP').toBe(true);
    expect(responses).toBe(1);
  });
});

test('[SEC-01] collegamento esterno senza Referer', async ({ page, context, baseURL }) => {
  const url = probeUrl(baseURL, '__referrer_probe');
  const referers = [];
  // Context routing also covers the first request of a new popup.
  await context.route(url, async (route) => {
    referers.push((await route.request().allHeaders()).referer || null);
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Local reference probe</title><p>OK</p>'
    });
  });
  async function followLink() {
    await page.evaluate((url) => {
      const link = document.createElement('a');
      link.id = '__cvReferenceProbe';
      link.href = url;
      link.target = '_blank';
      link.textContent = 'Reference probe';
      document.body.append(link);
    }, url);
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.locator('#__cvReferenceProbe').click()
    ]);
    await popup.waitForLoadState('load');
    await popup.close();
  }
  await openSite(page);
  await followLink();
  expect(referers, 'Document policy must omit Referer on outbound navigation').toEqual([null]);

  // Positive control: a fresh document without the referrer meta uses the browser default.
  await page.route(baseURL, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<meta\b[^>]*name=["']referrer["'][^>]*>\s*/i, '');
    await route.fulfill({ response, body });
  });
  await openSite(page);
  await followLink();
  expect(referers, 'Control must disclose only the origin with the default policy').toEqual([
    null,
    new URL(baseURL).origin + '/'
  ]);
});
