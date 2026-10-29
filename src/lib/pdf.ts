export function renderSimplePdf(lines: string[]) {
  const safeLines = lines.slice(0, 48).map((line) => line.slice(0, 108));
  const content = safeLines.map((line, index) => `BT /F1 10 Tf 48 ${742 - index * 15} Td (${escapePdf(line)}) Tj ET`).join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`
  ];
  const header = '%PDF-1.4\n%âãÏÓ\n';
  let pdf = header;
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

function escapePdf(value: string) { return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replaceAll(/[^\x20-\x7E]/g, '?'); }
