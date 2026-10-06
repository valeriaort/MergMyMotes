import { expect, test } from '@playwright/test';
import { pdf } from './pdfs';

test('inspect all sources only after explicitly selecting a base', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf'), await pdf('lecture.pdf')]);
  await expect(page.getByRole('button', { name: 'Inspect notes' })).toBeDisabled();
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByLabel('Source type for lecture.pdf').selectOption('slides');
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('heading', { name: 'Your base document' })).toBeVisible();
  const base = page.getByRole('region', { name: 'Your base document' });
  await expect(base.getByRole('heading', { name: 'Cell biology' })).toBeVisible();
  await expect(base.getByText('Cells are the basic units of life.', { exact: true }).first()).toBeVisible();
  await expect(base.locator('em')).toHaveText('Remember the membrane.');
  await expect(page.getByText('lecture.pdf · Slides', { exact: true })).toBeVisible();
  await page.getByText('Original quotations and context').first().click();
  await expect(page.getByRole('blockquote').nth(1)).toHaveText('Cells are the basic units of life.');
  await expect(page.getByText(/Refresh clears your session/)).toBeVisible();
});

test('three sources keep their roles and changed inputs create a new session', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf'), await pdf('lecture.pdf'), await pdf('classmate.pdf')]);
  await page.getByLabel('Use lecture.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  const base = page.getByRole('region', { name: 'Your base document' });
  await expect(base.getByText('lecture.pdf', { exact: true })).toBeVisible();
  await expect(page.getByText('mine.pdf · Notes', { exact: true })).toBeVisible();
  await expect(page.getByText('classmate.pdf · Notes', { exact: true })).toBeVisible();
  await expect(base.getByRole('heading', { name: 'Cell biology' }).locator('strong')).toHaveText('Cell biology');
  await page.getByLabel('Source type for classmate.pdf').selectOption('slides');
  await expect(base).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByText('classmate.pdf · Slides', { exact: true })).toBeVisible();
  await page.getByLabel('Use mine.pdf as base').check();
  await expect(base).toHaveCount(0);
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(base.getByText('mine.pdf', { exact: true })).toBeVisible();
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('replacement.pdf'), await pdf('source.pdf')]);
  await expect(base).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Inspect notes' })).toBeDisabled();
  await page.getByLabel('Use replacement.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(base.getByText('replacement.pdf', { exact: true })).toBeVisible();
  await page.reload();
  await expect(base).toHaveCount(0);
  await expect(page.getByRole('radio')).toHaveCount(0);
});
