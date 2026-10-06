import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { pdf } from './pdfs';

const lines = ['Cells are units of life.', 'Membranes regulate transport.', 'Some cells have a nucleus.', 'Cells never have membranes.', 'The membrane may be porous.'];
async function inspect(page: Page, source = 'lecture.pdf') {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf'), await pdf(source, { lines })]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('button', { name: 'Compare notes', exact: true })).toBeVisible();
}
async function download(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Markdown' }).click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe('mine-merged.md');
  return readFile((await file.path())!, 'utf8');
}

test('approved exact insertions, reversals, and exported Markdown use the immutable base', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await inspect(page);
  await page.getByRole('button', { name: 'Compare notes', exact: true }).click();
  const current = page.getByRole('region', { name: 'Current notes', exact: true });
  const detail = page.getByRole('article', { name: 'Membranes regulate transport.', exact: true });
  const addition = page.getByRole('article', { name: 'Some cells have a nucleus.', exact: true });
  await expect(current).toBeVisible();
  await expect(page.getByText('5 proposals · 0 accepted · 4 remaining to review')).toBeVisible();
  await expect(page.getByRole('article', { name: 'Cells are units of life.', exact: true })).toBeHidden();
  const original = await download(page);
  expect(original).toBe('## **Cell biology**\n\nCells are the basic units of life\\.\n\n*Remember the membrane\\.*\n');
  await detail.getByText('Original evidence').click();
  await expect(detail.getByRole('blockquote')).toHaveText('Membranes regulate transport.');
  await expect(detail.getByText('lecture.pdf', { exact: true }).last()).toBeVisible();
  await detail.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(current.locator('mark')).toHaveText(['Membranes regulate transport.']);
  await addition.getByRole('button', { name: 'Reject', exact: true }).click();
  await page.screenshot({ path: 'test-results/review-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/review-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  const accepted = await download(page);
  expect(accepted).toBe(original.replace('\n\n*Remember', '\n\nMembranes regulate transport\\.\n\n*Remember'));
  await page.getByRole('button', { name: 'Copy Markdown' }).click();
  await expect(page.getByText('Copied current notes.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(accepted);
  await detail.getByRole('button', { name: 'Undo decision' }).click();
  expect(await download(page)).toBe(original);
  await addition.getByRole('button', { name: 'Undo decision' }).click();
  await addition.getByRole('button', { name: 'Accept', exact: true }).click();
  await detail.getByRole('button', { name: 'Accept', exact: true }).click();
  const reverseClickOrder = await download(page);
  await expect(current.locator('mark')).toHaveText(['Membranes regulate transport.', 'Some cells have a nucleus.']);
  await detail.getByRole('button', { name: 'Undo decision' }).click();
  await addition.getByRole('button', { name: 'Undo decision' }).click();
  await detail.getByRole('button', { name: 'Accept', exact: true }).click();
  await addition.getByRole('button', { name: 'Accept', exact: true }).click();
  expect(await download(page)).toBe(reverseClickOrder);
  expect(reverseClickOrder).not.toContain('Cells never');
  expect(reverseClickOrder).not.toContain('porous');
  await expect(page.getByRole('article', { name: 'Cells never have membranes.', exact: true }).getByRole('button')).toHaveCount(0);
  await expect(page.getByText(/confidence|\d+%/i)).toHaveCount(0);
  await page.getByLabel('Source type for lecture.pdf').selectOption('slides');
  await expect(current).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Download Markdown' })).toHaveCount(0);
});

test('a provider failure preserves inputs and permits retry', async ({ page }) => {
  await inspect(page, 'retry.pdf');
  await page.getByRole('button', { name: 'Compare notes', exact: true }).click();
  await expect(page.getByRole('alert', { name: 'Comparison error' })).toContainText('429');
  await expect(page.getByRole('region', { name: 'Your base document' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry comparison' }).click();
  await expect(page.getByRole('region', { name: 'Current notes', exact: true })).toBeVisible();
});

for (const source of ['bad-evidence.pdf', 'bad-target.pdf', 'bad-action.pdf', 'confidence.pdf', 'refusal.pdf', 'malformed.pdf', 'incomplete.pdf', 'missing-uncertain-content.pdf', 'conflict-content.pdf']) {
  test(`rejects ${source} before any proposal can be accepted`, async ({ page }) => {
    await inspect(page, source);
    await page.getByRole('button', { name: 'Compare notes', exact: true }).click();
    await expect(page.getByRole('alert', { name: 'Comparison error' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry comparison' })).toBeEnabled();
    await expect(page.getByRole('region', { name: 'Current notes', exact: true })).toHaveCount(0);
  });
}

test('an empty comparison exports the unchanged base', async ({ page }) => {
  await inspect(page, 'empty.pdf');
  await page.getByRole('button', { name: 'Compare notes', exact: true }).click();
  await expect(page.getByText('No relevant changes found. You can export your base unchanged.')).toBeVisible();
  expect(await download(page)).toContain('Cells are the basic units of life');
});

test('invalid client sessions are rejected before provider access', async ({ request }) => {
  for (const data of [{}, { id: 'x', baseId: '0', documents: [] }]) {
    const response = await request.post('/api/compare', { data });
    expect(response.status()).toBe(422);
  }
});

test('mixed-sentence claims keep context and independent decisions; uncertain and unplaced claims need review', async ({ page }) => {
  const mixed = 'Cells are units of life; membranes regulate transport, e.g., oxygen can cross.';
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([
    await pdf('mine.pdf'),
    await pdf('claims.pdf', { lines: [mixed, 'The membrane may be porous in this sample.', 'Next lecture: tissue organization.', 'Buy concert tickets this weekend.'] }),
  ]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await page.getByRole('button', { name: 'Compare notes', exact: true }).click();
  const current = page.getByRole('region', { name: 'Current notes', exact: true });
  const changes = page.getByRole('region', { name: 'Proposed changes', exact: true });
  const detail = changes.getByRole('article', { name: 'Membranes regulate transport.', exact: true });
  const example = changes.getByRole('article', { name: 'Oxygen can cross the membrane.', exact: true });
  const uncertain = changes.getByRole('article', { name: 'The membrane may be porous in this sample.', exact: true });
  const unplaced = changes.getByRole('article', { name: 'Next lecture: tissue organization.', exact: true });
  await expect(current).toBeVisible();
  const original = await download(page);
  await expect(changes.getByRole('article', { includeHidden: true })).toHaveCount(5);
  await expect(changes.getByRole('article', { name: /concert/ })).toHaveCount(0);
  await expect(detail.getByText('Useful detail', { exact: true })).toBeVisible();
  await expect(example.getByText('Example', { exact: true })).toBeVisible();
  for (const card of [detail, example]) {
    await card.getByText('Original evidence', { exact: true }).click();
    await expect(card.getByRole('blockquote')).toHaveText(mixed);
    await expect(card.getByText(/Context:/)).toContainText('The membrane may be porous in this sample.');
    await expect(card.getByText('Insert after: Cells are the basic units of life.')).toBeVisible();
  }
  await expect(uncertain.getByText('Pending your decision', { exact: true })).toBeVisible();
  await expect(unplaced.getByText(/No suitable placement in your base/)).toBeVisible();
  await expect(unplaced.getByRole('button', { name: 'Accept', exact: true })).toBeDisabled();
  await detail.getByRole('button', { name: 'Accept', exact: true }).click();
  await example.getByRole('button', { name: 'Reject', exact: true }).click();
  const detailOnly = await download(page);
  expect(detailOnly).toBe(original.replace('\n\n*Remember', '\n\nMembranes regulate transport\\.\n\n*Remember'));
  await expect(page.getByText('5 proposals · 1 accepted · 2 remaining to review')).toBeVisible();
  await uncertain.getByRole('button', { name: 'Reject', exact: true }).click();
  expect(await download(page)).toBe(detailOnly);
  await expect(page.getByText('5 proposals · 1 accepted · 1 remaining to review')).toBeVisible();
  await uncertain.getByRole('button', { name: 'Undo decision' }).click();
  await uncertain.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(current.locator('mark')).toHaveText(['Membranes regulate transport.', 'The membrane may be porous in this sample.']);
  expect(await download(page)).toBe(detailOnly.replace('\n\n*Remember', '\n\nThe membrane may be porous in this sample\\.\n\n*Remember'));
  await uncertain.getByRole('button', { name: 'Undo decision' }).click();
  expect(await download(page)).toBe(detailOnly);
  await example.getByRole('button', { name: 'Accept', exact: true }).click();
  const both = await download(page);
  await detail.getByRole('button', { name: 'Undo decision' }).click();
  await detail.getByRole('button', { name: 'Accept', exact: true }).click();
  expect(await download(page)).toBe(both);
  await expect(current.locator('mark')).toHaveText(['Membranes regulate transport.', 'E.g., oxygen can cross the membrane.']);
  expect(both).not.toMatch(/tissue|concert|porous|Cells are units/);
  await unplaced.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.getByText('5 proposals · 2 accepted · 1 remaining to review')).toBeVisible();
  await unplaced.getByRole('button', { name: 'Undo decision' }).click();
  expect(await download(page)).toBe(both);
});
