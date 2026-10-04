(() => {
  const root = document.documentElement;
  const canObserveSections = 'IntersectionObserver' in window;
  const links = [...document.querySelectorAll('.top-nav a, .index nav a')];
  const sections = [...document.querySelectorAll('.resume-section, .contact-section')];
  const header = document.querySelector('.site-header');
  const index = document.querySelector('.index');
  const footer = document.querySelector('footer');
  let observer;
  let readingLine = 0;
  let observedHeight = 0;

  function updateCurrentSection() {
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= readingLine + 1) current = section.id;
    }
    // The last section can be too short to reach the reading line.
    if (footer.getBoundingClientRect().bottom <= window.innerHeight + 1) {
      current = sections.at(-1).id;
    }
    for (const link of links) {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }

  function syncHeaderOffset() {
    const fontSize = parseFloat(getComputedStyle(root).fontSize);
    const gap = (Number.isFinite(fontSize) ? fontSize : 16) * 1.25;
    // The measured height already includes the safe-area padding.
    const offset = header.getBoundingClientRect().height + gap;
    const cssOffset = `${offset}px`;
    if (root.style.getPropertyValue('--header-offset') !== cssOffset) {
      root.style.setProperty('--header-offset', cssOffset);
    }
    const indexPosition = index.getBoundingClientRect().height + offset <= window.innerHeight ? 'sticky' : 'static';
    index.style.setProperty('--index-position', indexPosition);
    if (!canObserveSections) return;

    const viewportHeight = Math.max(1, window.innerHeight);
    const nextReadingLine = Math.max(0, Math.min(offset, viewportHeight - 1));
    if (observer && readingLine === nextReadingLine && observedHeight === viewportHeight) {
      updateCurrentSection();
      return;
    }
    const nextObserver = new IntersectionObserver(updateCurrentSection, {
      rootMargin: `-${nextReadingLine}px 0px -${viewportHeight - nextReadingLine - 1}px 0px`,
      threshold: 0
    });
    sections.forEach(section => nextObserver.observe(section));
    observer?.disconnect();
    observer = nextObserver;
    readingLine = nextReadingLine;
    observedHeight = viewportHeight;
    updateCurrentSection();
  }

  if (canObserveSections) {
    // Match the 1px rounding tolerance used by the bottom-of-page check.
    new IntersectionObserver(updateCurrentSection, { rootMargin: '0px 0px 1px 0px', threshold: 1 }).observe(footer);
    window.addEventListener('hashchange', updateCurrentSection);
  }
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(syncHeaderOffset);
    resizeObserver.observe(header);
    resizeObserver.observe(index);
    resizeObserver.observe(root);
  }
  if ('fonts' in document) {
    document.fonts.ready.then(syncHeaderOffset);
    document.fonts.addEventListener('loadingdone', syncHeaderOffset);
  }
  window.addEventListener('resize', syncHeaderOffset);
  window.addEventListener('pageshow', syncHeaderOffset);
  syncHeaderOffset();
})();
