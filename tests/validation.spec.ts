import { expect, test } from '@playwright/test';
import { pdf } from './pdfs';

test('reports every failed source and keeps inputs for retry without a partial session', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([
    await pdf('mine.pdf'), await pdf('scanned.pdf', { imageOnly: true }),
    { name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\nnot a readable PDF') },
  ]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('scanned.pdf: Page 1 has no selectable text');
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('broken.pdf: Could not extract this PDF');
  await expect(page.getByRole('heading', { name: 'Your base document' })).toHaveCount(0);
  await expect(page.getByLabel('Use mine.pdf as base')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Inspect notes' })).toBeEnabled();
});

test('explains file count and file type limits', async ({ page }) => {
  await page.goto('/');
  const input = page.getByLabel('Choose PDFs');
  await input.setInputFiles([await pdf('one.pdf')]);
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('Choose exactly two or three PDFs');
  await expect(page.getByRole('button', { name: 'Inspect notes' })).toBeDisabled();
  await input.setInputFiles(await Promise.all(['one.pdf', 'two.pdf', 'three.pdf', 'four.pdf'].map(name => pdf(name))));
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('Choose exactly two or three PDFs');
  await expect(page.getByRole('button', { name: 'Inspect notes' })).toBeDisabled();
  await input.setInputFiles([await pdf('mine.pdf'), { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('Lecture notes') }]);
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('notes.txt: Only PDF files are supported');
});

test('enforces 20 total pages across sources and can retry with smaller inputs', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf', { pages: 10 }), await pdf('lecture.pdf', { pages: 11 })]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('21 pages');
  await expect(page.getByRole('heading', { name: 'Your base document' })).toHaveCount(0);
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf', { pages: 10 }), await pdf('lecture.pdf', { pages: 10 })]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('status')).toContainText('20 pages');
});

test('server rejects missing base selection and invalid uploads even without browser controls', async ({ request }) => {
  const mine = await pdf('mine.pdf');
  const lecture = await pdf('lecture.pdf');
  async function upload(files: { name: string; mimeType: string; buffer: Buffer }[], base?: string, type = 'notes') {
    const form = new FormData();
    for (const file of files) {
      form.append('files', new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), file.name);
      form.append('sourceTypes', type);
    }
    if (base !== undefined) form.set('baseId', base);
    return request.post('/api/ingest', { multipart: form });
  }
  for (const base of [undefined, '', '-1', '2']) {
    const response = await upload([mine, lecture], base);
    expect(response.status()).toBe(422);
    expect((await response.json()).errors.join(' ')).toContain('Select a base document explicitly');
  }
  for (const files of [[mine], [mine, lecture, mine, lecture]]) {
    const response = await upload(files, '0');
    expect(response.status()).toBe(422);
    expect((await response.json()).errors.join(' ')).toContain('exactly two or three PDFs');
  }
  const wrongType = await upload([mine, { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('notes') }], '0');
  expect(wrongType.status()).toBe(422);
  expect((await wrongType.json()).errors.join(' ')).toContain('Only PDF files');
  const invalidSource = await upload([mine, lecture], '0', 'authoritative');
  expect(invalidSource.status()).toBe(422);
  expect((await invalidSource.json()).errors.join(' ')).toContain('notes or slides');
});

test('rejects blank and zero-byte PDFs with clear messages', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf'), { name: 'empty.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(0) }]);
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('empty.pdf: This file is empty');
  await page.getByLabel('Choose PDFs').setInputFiles([await pdf('mine.pdf'), await pdf('blank.pdf', { blank: true })]);
  await page.getByLabel('Use mine.pdf as base').check();
  await page.getByRole('button', { name: 'Inspect notes' }).click();
  await expect(page.getByRole('alert', { name: 'Document errors' })).toContainText('blank.pdf: Page 1 has no selectable text');
  await expect(page.getByRole('heading', { name: 'Your base document' })).toHaveCount(0);
});
