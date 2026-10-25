// Optional tooling: PLAYWRIGHT_MODULE=/tmp/passport-browser/node_modules/playwright node scripts/test_public_responsive.cjs
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
let browser;
(async () => {
  browser = await chromium.launch({ executablePath: process.env.RESPONSIVE_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const page = await browser.newPage();
  for (const route of ['/', '/trainer/login', '/trainee']) {
    await page.goto((process.env.RESPONSIVE_TEST_ORIGIN || 'http://localhost:3100') + route, { waitUntil: 'networkidle' });
    for (const width of [320, 390, 640, 767, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const result = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, small: innerWidth < 768 ? Array.from(document.querySelectorAll('button,a,input:not([type=hidden]),select')).filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 1 && rect.height > 1 && !element.classList.contains('sr-only') && (rect.width < 43.5 || rect.height < 43.5); }).map(element => element.getAttribute('aria-label') || element.textContent.trim().slice(0, 50) || element.tagName) : [] }));
      assert.ok(result.overflow <= 1, `${route}: overflow at ${width}px`);
      assert.deepEqual(result.small, [], `${route}: small controls at ${width}px`);
    }
    console.log(`PASS: public route ${route}, no overflow and mobile 44px controls`);
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); });
