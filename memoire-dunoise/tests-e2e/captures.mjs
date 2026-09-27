// Captures d'écran de contrôle (mobile et bureau).
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:4173/';
const sortie = process.argv[3] || '/tmp';
const pages = (process.argv[4] || ',histoire/,histoire/monument-aux-morts/,archives/loc-ggbain-17032/,combattants/').split(',');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [nom, vp] of [['mobile', { width: 390, height: 844 }], ['bureau', { width: 1366, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${sortie}/${nom}-${(p || 'accueil').replace(/\//g, '_')}.png`, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
