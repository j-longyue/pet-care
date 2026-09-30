const INVISIBLE_CHARS_REGEX = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}]/gu;

const BLANK_LOOKALIKES_REGEX = /[\u115F\u1160\u3164\uFFA0\u2800]/g;

const cleanText = (value) =>
  String(value)
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .replace(INVISIBLE_CHARS_REGEX, '')
    .replace(BLANK_LOOKALIKES_REGEX, '')
    .replace(/ {2,}/g, ' ')
    .trim();

module.exports = { cleanText };