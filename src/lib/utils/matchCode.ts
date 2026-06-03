/**
 * Generates a match code prefix from a category name.
 * 
 * Rules:
 * - "Boys' Singles U10"   → "BS10"
 * - "Boys' Doubles U14"   → "BD14"
 * - "Girls' Singles U12"  → "GS12"
 * - "Girls' Doubles U16"  → "GD16"
 * - "Men's Singles BB"    → "MSBB"
 * - "Men's Doubles BB"    → "MDBB"
 * - "Women's Singles A"   → "WSA"
 * - "Women's Doubles A"   → "WDA"
 * - "Mixed Doubles BB"    → "XDBB" (special case: Mixed = XD)
 * 
 * The full match code is: prefix + "-" + matchNumber
 * e.g. "BS10-1", "XDBB-3"
 */
export function generateMatchCodePrefix(categoryName: string): string {
  const name = categoryName.trim();

  // Normalize: lowercase for matching
  const lower = name.toLowerCase();

  // Determine the gender/type prefix
  let prefix = '';

  if (lower.startsWith('mixed')) {
    prefix = 'XD'; // Special case
  } else if (lower.startsWith("boy")) {
    // Boys' Singles or Boys' Doubles
    if (lower.includes('double')) {
      prefix = 'BD';
    } else {
      prefix = 'BS';
    }
  } else if (lower.startsWith("girl")) {
    if (lower.includes('double')) {
      prefix = 'GD';
    } else {
      prefix = 'GS';
    }
  } else if (lower.startsWith("men") || lower.startsWith("man")) {
    if (lower.includes('double')) {
      prefix = 'MD';
    } else {
      prefix = 'MS';
    }
  } else if (lower.startsWith("women") || lower.startsWith("woman")) {
    if (lower.includes('double')) {
      prefix = 'WD';
    } else {
      prefix = 'WS';
    }
  } else {
    // Fallback: take first letter of each word (up to 4 chars), uppercase
    const words = name.split(/\s+/).filter(Boolean);
    prefix = words.map(w => w[0].toUpperCase()).join('').slice(0, 4);
  }

  // Extract the suffix: age group like U10/U12/U14/U16 or division like BB/A/B/Open
  // Look for "U" followed by digits
  const ageMatch = name.match(/U(\d+)/i);
  if (ageMatch) {
    return prefix + ageMatch[1]; // e.g. "BS" + "10" = "BS10"
  }

  // Otherwise, take the last word(s) after Singles/Doubles as the division
  // e.g. "Men's Singles BB" → suffix = "BB"
  // e.g. "Women's Doubles Open" → suffix = "OPEN"
  const parts = name.split(/\s+/);
  // Find the index of "Singles" or "Doubles" and take everything after
  let suffixParts: string[] = [];
  let foundType = false;
  for (const part of parts) {
    if (foundType) {
      suffixParts.push(part);
    }
    if (part.toLowerCase() === 'singles' || part.toLowerCase() === 'doubles') {
      foundType = true;
    }
  }

  if (suffixParts.length > 0) {
    const suffix = suffixParts.join('').toUpperCase();
    return prefix + suffix;
  }

  // Last resort: just use the prefix
  return prefix;
}
