export function validateFiles(files: File[]): string[] {
  const errors: string[] = [];
  if (files.length < 2 || files.length > 3) errors.push('Choose exactly two or three PDFs: one base and one or two comparison sources.');
  for (const file of files) {
    if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf' && file.type !== 'application/octet-stream')) errors.push(`${file.name}: Only PDF files are supported.`);
    else if (file.size === 0) errors.push(`${file.name}: This file is empty. Choose a selectable-text PDF.`);
  }
  return errors;
}
