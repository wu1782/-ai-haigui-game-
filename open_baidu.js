const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.baidu.com');
  console.log('Page opened successfully');
  await browser.close();
})();
