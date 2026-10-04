(() => {
  const root = document.documentElement;
  const canObserveSections = 'IntersectionObserver' in window;
  const links = [...document.querySelectorAll('.top-nav a, .index nav a')];
  const sections = [...document.querySelectorAll('.resume-section, .contact-section')];
  const header = document.querySelector('.site-header');
  const index = document.querySelector('.index');
  const footer = document.querySelector('footer');
  // A reduced template can keep its native links without this enhancement.
  if (!header || !index || !footer || sections.length === 0) return;
  let observer;
  let readingLine = 0;
  let observedHeight = 0;
  let currentSection;
  let updatePending = false;
  let layoutPending = false;

  function scheduleUpdate(measureLayout = false) {
    layoutPending = layoutPending || measureLayout;
    if (updatePending) return;
    updatePending = true;
    requestAnimationFrame(() => {
      updatePending = false;
      const needsLayout = layoutPending;
      layoutPending = false;
      if (needsLayout) syncHeaderOffset();
      else updateCurrentSection();
    });
  }
  const requestLayoutUpdate = () => scheduleUpdate(true);
  const requestSectionUpdate = () => scheduleUpdate();

  function updateCurrentSection() {
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= readingLine + 1) current = section.id;
    }
    // The last section can be too short to reach the reading line.
    if (footer.getBoundingClientRect().bottom <= window.innerHeight + 1) {
      current = sections[sections.length - 1].id;
    }
    if (current === currentSection) return;
    currentSection = current;
    for (const link of links) {
      if (link.hash === `#${current}`) {
        if (link.getAttribute('aria-current') !== 'location')
          link.setAttribute('aria-current', 'location');
      } else if (link.hasAttribute('aria-current')) link.removeAttribute('aria-current');
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
    const indexPosition =
      index.getBoundingClientRect().height + offset <= window.innerHeight ? 'sticky' : 'static';
    if (index.style.getPropertyValue('--index-position') !== indexPosition) {
      index.style.setProperty('--index-position', indexPosition);
    }
    if (!canObserveSections) return;

    const viewportHeight = Math.max(1, window.innerHeight);
    const nextReadingLine = Math.max(0, Math.min(offset, viewportHeight - 1));
    if (observer && readingLine === nextReadingLine && observedHeight === viewportHeight) {
      updateCurrentSection();
      return;
    }
    const nextObserver = new IntersectionObserver(requestSectionUpdate, {
      rootMargin: `-${nextReadingLine}px 0px -${viewportHeight - nextReadingLine - 1}px 0px`,
      threshold: 0
    });
    sections.forEach((section) => nextObserver.observe(section));
    observer?.disconnect();
    observer = nextObserver;
    readingLine = nextReadingLine;
    observedHeight = viewportHeight;
    updateCurrentSection();
  }

  if (canObserveSections) {
    // Match the 1px rounding tolerance used by the bottom-of-page check.
    new IntersectionObserver(requestSectionUpdate, {
      rootMargin: '0px 0px 1px 0px',
      threshold: 1
    }).observe(footer);
    window.addEventListener('hashchange', requestSectionUpdate);
  }
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(requestLayoutUpdate);
    resizeObserver.observe(header);
    resizeObserver.observe(index);
    resizeObserver.observe(root);
  }
  if ('fonts' in document) {
    document.fonts.ready.then(requestLayoutUpdate);
    document.fonts.addEventListener('loadingdone', requestLayoutUpdate);
  }
  window.addEventListener('resize', requestLayoutUpdate);
  window.addEventListener('pageshow', requestLayoutUpdate);
  syncHeaderOffset();
})();
