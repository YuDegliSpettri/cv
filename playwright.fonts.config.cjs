const { defineConfig } = require('@playwright/test');
const config = require('./playwright.config.cjs');

module.exports = defineConfig(config, {
  testMatch: '**/fonts.spec.cjs',
  projects: config.projects.filter((project) => project.use.fontMode !== 'fallback')
});
