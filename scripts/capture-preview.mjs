import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.cache/playwright');
const { chromium } = await import('@playwright/test');

await mkdir('.cache/screenshots', { recursive: true });
const browser = await chromium.launch(process.argv[2] ? { channel: process.argv[2] } : {});
try {
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1100 }], ['mobile', { width: 375, height: 812 }]]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    await page.goto(process.env.ENIGMA_PREVIEW_URL || 'http://127.0.0.1:5173/');
    await page.getByLabel('输入消息', { exact: false }).fill('HELLO, ENIGMA.\n每一次按键，都是新的秘密。');
    await page.screenshot({ path: `.cache/screenshots/${name}.png`, fullPage: true, animations: 'disabled' });
    console.log(JSON.stringify({ name, viewport, scrollWidth: await page.evaluate(() => document.documentElement.scrollWidth) }));
    await page.close();
  }
} finally { await browser.close(); }
