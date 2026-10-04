const { test, expect } = require('./fixtures.cjs');
const { appendCss, spacingCss, openSite, assertLayout, assertHeaderOffset, activateSection, contactColors, contrast } = require('./helpers.cjs');

async function assertFonts(page) {
  const loaded = await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded').map(font => font.family));
  expect(loaded).toContain('Manrope'); expect(loaded).toContain('DM Sans');
}

test('[SEC-02/AUD-01] font locali caricati senza richieste esterne', async ({ page, request, externalRequests }) => {
  const fontResponses = [];
  page.on('response', response => {
    if (response.request().resourceType() === 'font') fontResponses.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'] });
  });
  await openSite(page);
  expect(externalRequests, 'Requests must stay on site origin').toEqual([]);
  await assertFonts(page);
  expect(fontResponses).toHaveLength(2);
  for (const response of fontResponses) {
    expect(new URL(response.url).pathname).toMatch(/^\/cv\/fonts\/.+\.woff2$/);
    expect(response.status).toBe(200);
    expect(response.type).toBe('font/woff2');
  }
  for (const file of ['fonts/Manrope-OFL.txt', 'fonts/DM-Sans-OFL.txt']) {
    const response = await request.get(file);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('SIL OPEN FONT LICENSE Version 1.1');
  }
});

test('[FONTS] caricamento tardivo aggiorna header e frammenti', async ({ page }, testInfo) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/fonts/*.woff2', async route => { await ready; await route.fallback(); });
  await appendCss(page, 'html { font-size: 200%; }');
  await page.setViewportSize({ width: 768, height: 1024 });
  try {
    await page.goto('./', { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => [...document.fonts].filter(font => font.status === 'loaded'))).toEqual([]);
    await expect(page.locator('h1')).toBeVisible();
    await assertHeaderOffset(page);
    await assertLayout(page, testInfo);
    release();
    await page.evaluate(() => document.fonts.ready);
    // Font readiness precedes the paint and ResizeObserver delivery in Chromium.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await assertFonts(page);
    await assertHeaderOffset(page);
    await assertLayout(page, testInfo);
    try { await activateSection(page, 'esperienze'); }
    catch (error) {
      await testInfo.attach('late-font-navigation', { body: JSON.stringify(await page.evaluate(() => ({
        hash: location.hash, scroll: scrollY, offset: getComputedStyle(document.documentElement).scrollPaddingTop,
        header: document.querySelector('.site-header').getBoundingClientRect().height,
        fonts: [...document.fonts].map(font => ({ family: font.family, status: font.status })),
        sections: [...document.querySelectorAll('.resume-section')].map(section => ({ id: section.id, top: section.getBoundingClientRect().top }))
      })), null, 2), contentType: 'application/json' });
      throw error;
    }
  } finally { release(); }
});

test('[FONTS] testo 200% a 768px e accesso diretto a una sezione', async ({ page }, testInfo) => {
  await appendCss(page, 'html { font-size: 200%; }');
  await page.setViewportSize({ width: 768, height: 1024 });
  await openSite(page, './#esperienze');
  await assertFonts(page);
  await assertLayout(page, testInfo);
  await assertHeaderOffset(page);
  await activateSection(page, 'esperienze');
});

test('[FONTS] spaziatura a 320px', async ({ page }, testInfo) => {
  await appendCss(page, spacingCss);
  await page.setViewportSize({ width: 320, height: 568 });
  await openSite(page); await assertFonts(page);
  await assertLayout(page, testInfo);
});

test('[FONTS] frammenti e contrasto print', async ({ page }) => {
  await openSite(page); await assertFonts(page);
  for (const id of await page.locator('.resume-section, .contact-section').evaluateAll(sections => sections.map(section => section.id))) {
    await activateSection(page, id);
    await expect(page.locator(`.index a[href="#${id}"]`)).toHaveAttribute('aria-current', 'location');
  }
  await page.emulateMedia({ media: 'print' });
  for (const text of await contactColors(page)) expect(contrast(text.color, text.background)).toBeGreaterThanOrEqual(4.5);
});
