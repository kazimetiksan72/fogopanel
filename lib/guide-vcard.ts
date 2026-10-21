type GuideContact = { firstName: string; lastName: string; phone: string };

function escapeText(value: string) {
  return value.trim()
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line: string) {
  let result = '';
  let lineBytes = 0;
  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (lineBytes + characterBytes > 75) {
      result += '\r\n ';
      lineBytes = 1;
    }
    result += character;
    lineBytes += characterBytes;
  }
  return result;
}

export function buildGuideVCard(guide: GuideContact) {
  const firstName = escapeText(guide.firstName);
  const lastName = escapeText(guide.lastName);
  const digits = guide.phone.replace(/\D/g, '');
  const phone = `${guide.phone.trim().startsWith('+') ? '+' : ''}${digits}`;

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    foldLine(`N:${lastName};${firstName};;;`),
    foldLine(`FN:${firstName} ${lastName}`),
    `TEL;TYPE=CELL:${phone}`,
    'END:VCARD',
  ].join('\r\n');
}
