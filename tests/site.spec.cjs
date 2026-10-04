const { test, expect } = require('./fixtures.cjs');
const { spacingCss, appendCss, openSite, assertLayout, assertHeaderOffset, activateSection, contactColors, contrast } = require('./helpers.cjs');

const viewports = [[1440,900], [1000,768], [768,1024], [701,900], [700,900], [390,844], [320,568], [844,390]];
const modes = [
  { name: '[LAYOUT] normale', css: '' },
  { name: '[A11Y-01] testo 200%', css: 'html { font-size: 200%; }', enlarged: true },
  { name: '[A11Y-02] spaziatura', css: spacingCss },
  { name: '[A11Y-01/02] testo 200% e spaziatura', css: 'html { font-size: 200%; }\n' + spacingCss, enlarged: true }
];
for (const [width, height] of viewports) {
  for (const mode of modes) {
    test(`${mode.name} ${width}x${height}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height });
      if (mode.css) await appendCss(page, mode.css);
      await openSite(page);
      const snapshot = await assertLayout(page, testInfo);
      if (mode.enlarged) expect(snapshot.fontSize, 'Text enlargement must remain at 200%').toBeCloseTo(32);
    });
  }
}

test('[NAV] tutti i frammenti, sezione corrente e fondo pagina', async ({ page }, testInfo) => {
  await openSite(page);
  const ids = await page.locator('.resume-section, .contact-section').evaluateAll(sections => sections.map(section => section.id));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) {
    await activateSection(page, id);
    await expect(page.locator(`.index a[href="#${id}"]`)).toHaveAttribute('aria-current', 'location');
    if (id === ids.at(-1)) {
      await testInfo.attach('end-of-page', { body: JSON.stringify(await page.evaluate(() => ({
        footerBottom: document.querySelector('footer').getBoundingClientRect().bottom,
        viewportHeight: innerHeight, scrollTop: scrollY, scrollHeight: document.documentElement.scrollHeight,
        active: [...document.querySelectorAll('[aria-current]')].map(link => link.hash)
      })), null, 2), contentType: 'application/json' });
    }
    const active = await page.locator('[aria-current]').evaluateAll(links => links.map(link => link.hash));
    expect(active.every(hash => hash === `#${id}`)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator(`.index a[href="#${ids.at(-1)}"]`)).toHaveAttribute('aria-current', 'location');
});

test('[CP-01] offset auto usa il vero IntersectionObserver senza margini NaN', async ({ page }) => {
  await appendCss(page, 'html { scroll-padding-top: auto !important; }');
  await page.addInitScript(() => {
    window.__margins = [];
    const NativeObserver = window.IntersectionObserver;
    window.IntersectionObserver = class extends NativeObserver {
      constructor(callback, options) {
        window.__margins.push(options?.rootMargin);
        super(callback, options);
      }
    };
  });
  await openSite(page);
  const margins = await page.evaluate(() => window.__margins.filter(margin => margin !== undefined));
  expect(margins.length).toBeGreaterThan(0);
  for (const margin of margins) expect(margin.split(' ').map(parseFloat).every(Number.isFinite), `Finite rootMargin required: ${margin}`).toBe(true);
});

for (const api of ['IntersectionObserver', 'ResizeObserver']) {
  test(`[CP-01] navigazione senza ${api}`, async ({ page }, testInfo) => {
    await page.addInitScript(api => delete window[api], api);
    await appendCss(page, 'html { font-size: 200%; }');
    await page.setViewportSize({ width: 390, height: 844 });
    await openSite(page);
    await assertHeaderOffset(page);
    await activateSection(page, 'esperienze');
    await page.setViewportSize({ width: 844, height: 390 });
    await assertHeaderOffset(page);
    try { await activateSection(page, 'competenze'); }
    catch (error) {
      await testInfo.attach('fallback-navigation', { body: JSON.stringify(await page.evaluate(() => ({
        hash: location.hash, scrollY, viewport: { width: innerWidth, height: innerHeight },
        offset: getComputedStyle(document.documentElement).scrollPaddingTop,
        headerHeight: document.querySelector('.site-header').getBoundingClientRect().height,
        activeElement: document.activeElement.outerHTML,
        sections: [...document.querySelectorAll('.resume-section, .contact-section')].map(section => ({
          id: section.id, top: section.getBoundingClientRect().top
        }))
      })), null, 2), contentType: 'application/json' });
      throw error;
    }
  });
}

test('[CP-01] stylesheet assente non interrompe il runtime', async ({ page }) => {
  await page.route('**/styles.css', route => route.abort());
  await openSite(page);
  await page.locator('.index a[href="#esperienze"]').click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#esperienze');
});

test('[CP-03] offset misurato con testo 200%, resize e indice adattivo', async ({ page }) => {
  await appendCss(page, 'html { font-size: 200%; }');
  await page.setViewportSize({ width: 768, height: 1024 });
  await openSite(page);
  await assertHeaderOffset(page);
  await activateSection(page, 'esperienze');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await assertHeaderOffset(page);
    await activateSection(page, 'competenze');
  }
});

test('[CP-03] margine rem aggiornato con header invariato', async ({ page }) => {
  await openSite(page);
  const height = await page.locator('.site-header').evaluate(header => header.getBoundingClientRect().height);
  await page.evaluate(() => { document.documentElement.style.fontSize = '112.5%'; });
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(18);
  await assertHeaderOffset(page);
  const updatedHeight = await page.locator('.site-header').evaluate(header => header.getBoundingClientRect().height);
  expect(updatedHeight).toBeCloseTo(height);
});

test('[NAV] frammento iniziale, cronologia e pageshow', async ({ page }) => {
  await openSite(page, './#esperienze');
  await assertHeaderOffset(page);
  await expect(page.locator('.index a[href="#esperienze"]')).toHaveAttribute('aria-current', 'location');
  await openSite(page, './?history-check=1');
  await page.goBack({ waitUntil: 'load' });
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await assertHeaderOffset(page);
  await activateSection(page, 'profilo');
});

test.describe('progressive enhancement', () => {
  test.use({ javaScriptEnabled: false });
  test('[NAV] link utilizzabile senza JavaScript', async ({ page }) => {
    await page.goto('./', { waitUntil: 'load' });
    await page.locator('.top-nav a[href="#contatti"]').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#contatti');
    await expect(page.locator('.contact-section')).toBeVisible();
  });
});

for (const theme of ['light', 'dark']) {
  test(`[A11Y-03] stampa ${theme}: contrasto dei contatti e ritorno a schermo`, async ({ page }) => {
    await page.emulateMedia({ media: 'screen', colorScheme: theme });
    await openSite(page);
    const screen = await contactColors(page);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.contact-location')).toBeVisible();
    const print = await contactColors(page);
    expect(print.length).toBeGreaterThan(0);
    for (const text of print) {
      expect(text.background).toEqual([255, 255, 255]);
      expect(contrast(text.color, text.background), `Print contrast for ${text.text}`).toBeGreaterThanOrEqual(4.5);
    }
    await page.emulateMedia({ media: 'screen' });
    expect(await contactColors(page)).toEqual(screen);
  });
}

test('[STATIC] asset sotto /cv/ e percorsi esclusi dal server', async ({ request }) => {
  for (const [file, type] of [
    ['', 'text/html'], ['styles.css', 'text/css'], ['navigation.js', 'application/javascript'], ['favicon.svg', 'image/svg+xml'],
    ['fonts/manrope-latin-variable.woff2', 'font/woff2'], ['fonts/dm-sans-latin-variable.woff2', 'font/woff2'],
    ['fonts/Manrope-OFL.txt', 'text/plain'], ['fonts/DM-Sans-OFL.txt', 'text/plain']
  ]) {
    const response = await request.get(file || './');
    expect(response.status(), file).toBe(200);
    expect(response.headers()['content-type']).toContain(type);
  }
  for (const pathname of ['/cv/analisi/README.md', '/cv/package.json', '/cv/tests/site.spec.cjs', '/.git/config', '/cv/%2e%2e/.git/config']) {
    expect((await request.get(pathname)).status(), pathname).toBe(404);
  }
  expect((await request.post('./')).status()).toBe(405);
});

test('[STATIC] ID, frammenti e riferimenti ARIA risolti', async ({ page }) => {
  await openSite(page);
  const problems = await page.evaluate(() => {
    const ids = new Set(); const errors = [];
    for (const element of document.querySelectorAll('[id]')) {
      if (ids.has(element.id)) errors.push(`Duplicate ID: ${element.id}`);
      ids.add(element.id);
    }
    for (const link of document.querySelectorAll('a[href^="#"]')) {
      const id = decodeURIComponent(link.hash.slice(1));
      if (id && !ids.has(id)) errors.push(`Missing fragment: ${id}`);
    }
    for (const element of document.querySelectorAll('[aria-labelledby], [aria-describedby]')) {
      for (const attribute of ['aria-labelledby', 'aria-describedby']) {
        for (const id of (element.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) {
          if (!ids.has(id)) errors.push(`Missing ${attribute}: ${id}`);
        }
      }
    }
    return errors;
  });
  expect(problems, 'Static HTML references must resolve').toEqual([]);
});
