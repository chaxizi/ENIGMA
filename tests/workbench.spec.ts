import { expect, test, type Page } from '@playwright/test';

async function settings(page: Page) {
  const panel = page.locator('details').filter({ has: page.getByText('MACHINE SETTINGS', { exact: true }) });
  if (!(await panel.getAttribute('open') !== null)) await panel.locator('summary').click();
}

test('encodes, edits, appends, clears and refreshes without state persistence', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const input = page.getByLabel('输入消息', { exact: false });
  const output = page.getByLabel('转换结果', { exact: false });
  await input.fill('aaaaa'); await expect(input).toHaveValue('AAAAA'); await expect(output).toHaveValue('BDZGO');
  await input.press('End'); await input.press('Backspace'); await expect(output).toHaveValue('BDZG');
  await page.getByRole('button', { name: '输入字母 A', exact: true }).click(); await expect(output).toHaveValue('BDZGO');
  await page.getByRole('button', { name: '清空消息', exact: true }).click();
  await input.fill('a中ß🙂 123!a'); await expect(output).toHaveValue('B中ß🙂 123!D');
  await settings(page);
  await page.getByLabel('右转子初始位置', { exact: true }).selectOption('1');
  await expect(output).toHaveValue('B中ß🙂 123!D');
  await page.getByRole('button', { name: '应用配置' }).click(); await expect(output).toHaveValue('D中ß🙂 123!Z');
  await page.reload(); await expect(input).toHaveValue('');
  await expect(page.getByLabel('右转子当前位置', { exact: true })).toHaveText('A');
  expect(errors).toEqual([]);
});

test('matches the historical vector and decodes from the same initial settings', async ({ page }) => {
  await page.goto('/'); await settings(page);
  // Use unused rotors first so duplicate choices remain disabled throughout.
  await page.getByLabel('中转子型号', { exact: true }).selectOption('IV');
  await page.getByLabel('左转子型号', { exact: true }).selectOption('II');
  await page.getByLabel('右转子型号', { exact: true }).selectOption('V');
  for (const [slot, ring, position] of [['左', '1', '22'], ['中', '20', '23'], ['右', '11', '2']]) {
    await page.getByLabel(`${slot}转子环位`, { exact: true }).selectOption({ value: ring });
    await page.getByLabel(`${slot}转子初始位置`, { exact: true }).selectOption(position);
  }
  for (const pair of 'AV BS CG DL FU HZ IN KM OW RX'.split(' ')) {
    await page.getByLabel('插线字母1', { exact: true }).selectOption(pair[0]);
    await page.getByLabel('插线字母2', { exact: true }).selectOption(pair[1]);
    await page.getByRole('button', { name: '连接字母' }).click();
  }
  await page.getByRole('button', { name: '应用配置' }).click();
  await page.getByLabel('输入消息', { exact: false }).fill('BLA');
  await expect(page.getByLabel('转换结果', { exact: false })).toHaveValue('KCH');
  await page.getByLabel('输入消息', { exact: false }).fill('KCH');
  await expect(page.getByLabel('转换结果', { exact: false })).toHaveValue('BLA');
  await page.getByLabel('插线字母1', { exact: true }).selectOption('E');
  await page.getByLabel('插线字母2', { exact: true }).selectOption('J');
  await page.getByRole('button', { name: '连接字母' }).click();
  await expect(page.getByRole('alert')).toContainText('十对');
  await page.getByRole('button', { name: '恢复默认' }).click();
  await expect(page.getByLabel('输入消息', { exact: false })).toHaveValue('');
});

test('handles composition, excessive paste, and clipboard failure', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('输入消息', { exact: false });
  const output = page.getByLabel('转换结果', { exact: false });
  await input.dispatchEvent('compositionstart');
  await input.evaluate((node: HTMLTextAreaElement) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, 'zhong');
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(input).toHaveValue('zhong'); await expect(output).toHaveValue('');
  await input.evaluate((node: HTMLTextAreaElement) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(node, '中a');
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '中a' }));
  });
  await expect(input).toHaveValue('中A'); await expect(output).toHaveValue('中B');
  await input.evaluate(node => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: { getData: () => 'X'.repeat(10001) } });
    node.dispatchEvent(event);
  });
  await expect(input).toHaveValue('中A'); await expect(page.getByRole('alert')).toContainText('10,000');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await page.getByRole('button', { name: '复制结果' }).click();
  await expect(page.getByRole('status')).toContainText('手动复制');
});

test('preserves the caret for middle edits and never drops rapidly clicked keys', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('输入消息', { exact: false });
  await input.fill('AAAA');
  await input.evaluate((node: HTMLTextAreaElement) => { node.focus(); node.setSelectionRange(1, 1); });
  await page.keyboard.type('bc');
  await expect(input).toHaveValue('ABCAAA');
  expect(await input.evaluate((node: HTMLTextAreaElement) => node.selectionStart)).toBe(3);
  await page.getByRole('button', { name: '清空消息', exact: true }).click();
  await page.getByRole('button', { name: '输入字母 A', exact: true }).evaluate((node: HTMLButtonElement) => {
    for (let n = 0; n < 60; n++) node.click();
  });
  await expect(input).toHaveValue('A'.repeat(60));
  await expect(page.getByLabel('转换结果', { exact: false })).toHaveValue(/^[B-Z]{60}$/);
});

test('keeps processing private and fits the viewport with keyboard-accessible controls', async ({ page }) => {
  await page.goto('/');
  const requests: string[] = [];
  page.on('request', request => {
    // A browser may request the local favicon after the document load event.
    if (request.url() !== new URL('/favicon.svg', page.url()).href) requests.push(request.url());
  });
  await page.getByLabel('输入消息', { exact: false }).fill('SECRET MESSAGE');
  await page.getByRole('button', { name: '输入字母 A', exact: true }).click();
  await settings(page);
  await page.getByLabel('右转子初始位置', { exact: true }).selectOption('3');
  await page.getByRole('button', { name: '应用配置' }).click();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  expect(page.url()).not.toContain('SECRET');
  await page.getByLabel('输入消息', { exact: false }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '复制结果' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('转换结果', { exact: false })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '输入字母 Q', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '清空消息', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('输入消息', { exact: false })).toHaveValue('');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.getByRole('button', { name: '输入字母 A', exact: true }).evaluate(node => getComputedStyle(node).transitionDuration)).toBe('0s');
});
