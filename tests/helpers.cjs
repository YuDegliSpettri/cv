const { expect } = require('@playwright/test');
const spacingCss =
  '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }';

async function appendCss(page, css) {
  await page.route('**/styles.css', async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + '\n' + css });
  });
}

async function openSite(page, url = './') {
  await page.goto(url, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  );
}

async function assertLayout(page, testInfo) {
  const snapshot = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const problems = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      problems.push(`Page overflow: ${document.documentElement.scrollWidth} > ${innerWidth}`);
    if (['hidden', 'clip'].includes(getComputedStyle(document.body).overflowX))
      problems.push('Body overflow must not be hidden');
    for (const element of document.querySelectorAll('body *')) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.left < -1 || rect.right > innerWidth + 1)
        problems.push(`Element outside viewport: ${element.tagName}.${element.className}`);
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent.trim() || !visible(node.parentElement)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1))
          problems.push(`Text outside viewport: ${node.textContent.trim().slice(0, 60)}`);
      }
    }
    return {
      width: innerWidth,
      height: innerHeight,
      fontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
      problems
    };
  });
  if (snapshot.problems.length)
    await testInfo.attach('layout', {
      body: JSON.stringify(snapshot, null, 2),
      contentType: 'application/json'
    });
  expect(snapshot.problems, `No layout overflow at ${snapshot.width}x${snapshot.height}`).toEqual(
    []
  );
  return snapshot;
}

async function assertHeaderOffset(page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const rootStyle = getComputedStyle(document.documentElement);
          const expected =
            document.querySelector('.site-header').getBoundingClientRect().height +
            parseFloat(rootStyle.fontSize) * 1.25;
          const index = document.querySelector('.index');
          const indexStyle = getComputedStyle(index);
          return (
            Math.abs(parseFloat(rootStyle.scrollPaddingTop) - expected) < 1.1 &&
            Math.abs(parseFloat(indexStyle.top) - expected) < 1.1 &&
            (indexStyle.position !== 'sticky' ||
              index.getBoundingClientRect().height + expected <= innerHeight + 1.1)
          );
        }),
      { message: 'CSS offset and index must follow actual header height and fit the viewport' }
    )
    .toBe(true);
}

async function activateSection(page, id) {
  await page.locator(`.index a[href="#${id}"]`).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => location.hash)).toBe(`#${id}`);
  await expect
    .poll(
      () =>
        page.evaluate((id) => {
          const top = document.getElementById(id).getBoundingClientRect().top;
          const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
          return top >= offset - 1.1 && top < innerHeight;
        }, id),
      { message: `Section ${id} must be visible below the header` }
    )
    .toBe(true);
}

async function contactColors(page) {
  return page.locator('.contact-section').evaluate((contact) => {
    const rgb = (value) =>
      value
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number);
    const background = rgb(getComputedStyle(contact).backgroundColor);
    return [
      ...contact.querySelectorAll(
        '.eyebrow, h2, .contact-location, .contact-label, .contact-value a'
      )
    ].map((element) => ({
      text: element.textContent.trim(),
      color: rgb(getComputedStyle(element).color),
      background
    }));
  });
}

function contrast(color, background) {
  const luminance = (rgb) => {
    const c = rgb.map((value) => {
      const n = value / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  const [light, dark] = [luminance(color), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

module.exports = {
  spacingCss,
  appendCss,
  openSite,
  assertLayout,
  assertHeaderOffset,
  activateSection,
  contactColors,
  contrast
};
