const MAPPED: Record<number, string> = {
  // German sharp-s
  0x00DF: 'ss',
  // Greek final sigma
  0x03C2: 'σ',
  // Fullwidth ASCII (FF01-FF5E → 0021-007E)
}

// Build fullwidth mapping (Ａ-Ｚ → a-z, ０-９ → 0-9, etc.)
for (let i = 0xFF01; i <= 0xFF5E; i++) {
  const mapped = i - 0xFEE0
  MAPPED[i] = String.fromCodePoint(mapped)
}

// Halfwidth Katakana → Fullwidth (basic)
// These are common in Japanese ENS names

const DISALLOWED = new Set([
  0x200B, // zero width space
  0x200C, // zero width non-joiner
  0x200D, // zero width joiner (except in valid emoji sequences)
  0xFEFF, // BOM
  0x00AD, // soft hyphen
  0x034F, // combining grapheme joiner
  0x115F, 0x1160, // Hangul fillers
  0x17B4, 0x17B5, // Khmer vowel inherent
  0x2028, // line separator
  0x2029, // paragraph separator
])

export function ensNormalize(name: string): string {
  const trimmed = name.trim()
  let result = ''

  for (const char of trimmed) {
    const cp = char.codePointAt(0)!

    // Skip disallowed characters
    if (DISALLOWED.has(cp)) continue

    // Apply mapping table
    if (cp in MAPPED) {
      result += MAPPED[cp]!.toLowerCase()
      continue
    }

    // Standard lowercase
    result += char.toLowerCase()
  }

  // NFC normalization (built-in)
  result = result.normalize('NFC')

  // Validate labels
  const labels = result.split('.')
  for (const label of labels) {
    if (label.length === 0 && result !== '') {
      throw new Error(`ENS: empty label in "${trimmed}"`)
    }
    // Labels cannot start or end with hyphen
    if (label.startsWith('-') || label.endsWith('-')) {
      throw new Error(`ENS: label "${label}" starts or ends with hyphen`)
    }
    // Check for combining marks at start of label
    if (label.length > 0) {
      const firstCp = label.codePointAt(0)!
      const category = getUnicodeCategory(firstCp)
      if (category === 'M') {
        throw new Error(`ENS: label "${label}" starts with combining mark`)
      }
    }
  }

  return result
}

function getUnicodeCategory(cp: number): string {
  // Combining marks ranges (simplified)
  if ((cp >= 0x0300 && cp <= 0x036F) || // Combining Diacritical Marks
      (cp >= 0x1AB0 && cp <= 0x1AFF) || // Combining Diacritical Marks Extended
      (cp >= 0x1DC0 && cp <= 0x1DFF) || // Combining Diacritical Marks Supplement
      (cp >= 0x20D0 && cp <= 0x20FF) || // Combining Diacritical Marks for Symbols
      (cp >= 0xFE20 && cp <= 0xFE2F)) { // Combining Half Marks
    return 'M'
  }
  return 'L'
}
