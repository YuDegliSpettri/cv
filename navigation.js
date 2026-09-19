(() => {
  if (!('IntersectionObserver' in window)) return;

  const links = [...document.querySelectorAll('.top-nav a, .index nav a')];
  const sections = [...document.querySelectorAll('.resume-section, .contact-section')];
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('footer');
  let observer;
  let readingLine = 0;

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

  function observeSections() {
    observer?.disconnect();
    readingLine = Math.min(
      parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
      window.innerHeight - 1
    );
    observer = new IntersectionObserver(updateCurrentSection, {
      rootMargin: `-${readingLine}px 0px -${window.innerHeight - readingLine - 1}px 0px`,
      threshold: 0
    });
    sections.forEach(section => observer.observe(section));
    updateCurrentSection();
  }

  new IntersectionObserver(updateCurrentSection, { threshold: 1 }).observe(footer);
  if ('ResizeObserver' in window) new ResizeObserver(observeSections).observe(header);
  window.addEventListener('resize', observeSections);
  window.addEventListener('pageshow', observeSections);
  window.addEventListener('hashchange', updateCurrentSection);
  observeSections();
})();
