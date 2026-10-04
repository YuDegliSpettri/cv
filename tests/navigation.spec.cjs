const { test, expect } = require('./fixtures.cjs');
const { openSite, activateSection, assertHeaderOffset } = require('./helpers.cjs');

test('[CP-02] ultima sezione corrente senza Array.at', async ({ page }) => {
  await page.addInitScript(() => {
    delete Array.prototype.at;
  });
  await openSite(page);
  expect(await page.evaluate(() => typeof Array.prototype.at)).toBe('undefined');
  const ids = await page
    .locator('.resume-section, .contact-section')
    .evaluateAll((sections) => sections.map((section) => section.id));
  for (const id of ids) {
    await activateSection(page, id);
    await expect(page.locator(`.index a[href="#${id}"]`)).toHaveAttribute(
      'aria-current',
      'location'
    );
  }
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.locator('.index a[href="#contatti"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
});

const incompleteTemplates = [
  {
    name: 'header',
    absent: '.site-header',
    transform: (html) => html.replace(/<header\b[\s\S]*?<\/header>/, '')
  },
  {
    name: 'indice',
    absent: '.index',
    transform: (html) => html.replace(/<aside class="index">[\s\S]*?<\/aside>/, '')
  },
  {
    name: 'footer',
    absent: 'footer',
    transform: (html) => html.replace(/<footer\b[\s\S]*?<\/footer>/, '')
  },
  // Retain the fragment targets while removing the classes used by the enhancement.
  {
    name: 'sezioni',
    absent: '.resume-section, .contact-section',
    transform: (html) =>
      html
        .replace(/\bresume-section\b/g, 'other-section')
        .replace(/\bcontact-section\b/g, 'other-contact')
  }
];
for (const template of incompleteTemplates) {
  test(`[CLN-03] template senza ${template.name}: link nativi utilizzabili`, async ({ page }) => {
    await page.route('**/cv/', async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: template.transform(await response.text()) });
    });
    await openSite(page);
    await expect(page.locator(template.absent)).toHaveCount(0);
    await expect(page.locator('h1')).toHaveText(/Mirko\s*Petrucci/);
    await page.locator('a[href="#profilo"]').first().focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#profilo');
    await expect(page.locator('#profilo')).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() =>
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    );
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
    await expect(page.locator('[aria-current]')).toHaveCount(0);
    // The page fixture also rejects any exception from initialization or later events.
  });
}

test('[CLN-05] aggiornamenti accorpati senza riscrivere la voce corrente', async ({
  page
}, testInfo) => {
  await page.addInitScript(() => {
    window.__navWork = {
      enabled: false,
      headerReads: 0,
      indexReads: 0,
      sectionReads: 0,
      observerCreations: 0,
      ariaMutations: 0,
      styleMutations: 0
    };
    const measure = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) {
      const work = window.__navWork;
      if (work.enabled) {
        if (this.matches('.site-header')) work.headerReads++;
        if (this.matches('.index')) work.indexReads++;
        if (this.matches('.resume-section, .contact-section')) work.sectionReads++;
      }
      return measure.apply(this, args);
    };
    const NativeObserver = window.IntersectionObserver;
    window.IntersectionObserver = class extends NativeObserver {
      constructor(callback, options) {
        super(callback, options);
        if (window.__navWork.enabled) window.__navWork.observerCreations++;
      }
    };
    new MutationObserver((records) => {
      if (!window.__navWork.enabled) return;
      for (const record of records) {
        if (record.attributeName === 'aria-current') window.__navWork.ariaMutations++;
        if (
          record.attributeName === 'style' &&
          (record.target.matches('html') || record.target.matches('.index'))
        )
          window.__navWork.styleMutations++;
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-current', 'style']
    });
  });
  await openSite(page);
  await activateSection(page, 'esperienze');
  await expect(page.locator('.index a[href="#esperienze"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
  // Let real observer/font deliveries settle before measuring the isolated event burst.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 6;
        const settle = () => (--frames ? requestAnimationFrame(settle) : resolve());
        requestAnimationFrame(settle);
      })
  );
  const work = await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => {
          window.__navWork.enabled = true;
          for (let i = 0; i < 20; i++) {
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
            document.fonts.dispatchEvent(new Event('loadingdone'));
          }
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.__navWork.enabled = false;
              resolve({ ...window.__navWork });
            })
          );
        })
      )
  );
  await testInfo.attach('navigation-work', {
    body: JSON.stringify(work, null, 2),
    contentType: 'application/json'
  });
  expect(work.sectionReads, 'One section scan for the event burst').toBe(7);
  expect(work.headerReads, 'One header measurement for the event burst').toBe(1);
  expect(work.indexReads, 'One index measurement for the event burst').toBe(1);
  expect(work.observerCreations, 'Reuse observers when geometry is unchanged').toBe(0);
  expect(work.ariaMutations, 'Unchanged aria-current must not be rewritten').toBe(0);
  expect(work.styleMutations, 'Unchanged geometry must not rewrite styles').toBe(0);
  await expect(page.locator('.index a[href="#esperienze"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await assertHeaderOffset(page);
  await activateSection(page, 'competenze');
  await expect(page.locator('.index a[href="#competenze"]')).toHaveAttribute(
    'aria-current',
    'location'
  );
});
