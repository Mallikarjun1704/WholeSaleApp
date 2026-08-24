/**
 * Advanced Parser utility for Wholesaler WhatsApp raw messages
 * Standardizes brands, model names, RAM/Storage variants, and price extraction.
 */

const KNOWN_BRANDS = [
  { key: 'redmi', name: 'REDMI' },
  { key: 'mi', name: 'REDMI' },
  { key: 'xiaomi', name: 'REDMI' },
  { key: 'poco', name: 'POCO' },
  { key: 'samsung', name: 'SAMSUNG' },
  { key: 'realme', name: 'REALME' },
  { key: 'apple', name: 'APPLE' },
  { key: 'iphone', name: 'APPLE' },
  { key: 'vivo', name: 'VIVO' },
  { key: 'oppo', name: 'OPPO' },
  { key: 'oneplus', name: 'ONEPLUS' },
  { key: 'iqoo', name: 'IQOO' },
  { key: 'motorola', name: 'MOTOROLA' },
  { key: 'moto', name: 'MOTOROLA' },
  { key: 'infinix', name: 'INFINIX' },
  { key: 'techno', name: 'TECNO' },
  { key: 'tecno', name: 'TECNO' },
  { key: 'nokia', name: 'NOKIA' },
  { key: 'nothing', name: 'NOTHING' },
  { key: 'google', name: 'GOOGLE' },
  { key: 'pixel', name: 'GOOGLE' },
  { key: 'honor', name: 'HONOR' },
];

function detectBrandFromLine(line) {
  // Strip emojis & special symbols first
  const clean = line
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}/gu, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .toLowerCase()
    .trim();
  const firstWord = clean.split(/\s+/)[0];

  for (const b of KNOWN_BRANDS) {
    if (clean.startsWith(b.key) || firstWord === b.key) {
      return b.name;
    }
  }
  return null;
}

function parseRawMessage(rawText, normalizationRules = []) {
  if (!rawText || typeof rawText !== 'string') {
    return { validRecords: [], skippedLines: [] };
  }

  const lines = rawText.split(/\r?\n/);
  const validRecords = [];
  const skippedLines = [];

  // Custom normalization lookup map
  const normMap = new Map();
  normalizationRules.forEach((rule) => {
    if (rule.rawPattern && rule.normalizedName) {
      normMap.set(rule.rawPattern.toLowerCase().trim(), rule.normalizedName.trim().toUpperCase());
    }
  });

  let currentBrand = '';

  for (let i = 0; i < lines.length; i++) {
    let rawLine = lines[i].trim();
    if (!rawLine) continue; // Ignore blank lines

    // Strip emojis and special unwanted decorative symbols immediately
    rawLine = rawLine
      .replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}/gu, ' ')
      .replace(/[▪▫◾◽✓✔★☆🔥📱💥✅➡️▶️📌⚡📍👉🏷️💰📦✨🏷🛒💯•●◆◇]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!rawLine) continue;

    // 1. Check if line is a Brand Header
    const detectedBrand = detectBrandFromLine(rawLine);

    // Check if line contains a price or RAM/ROM specification
    const hasRamRom = /\b\d{1,2}\s*[\/:]\s*\d{2,4}\b/.test(rawLine) || /\b(128|256|512)\b/i.test(rawLine);
    const hasPrice = /(?:₹|rs\.?|inr)?\s*(\d{1,3}(?:,\d{3})+|\d{4,6})/i.test(rawLine);

    if (detectedBrand) {
      // If line is short or has no RAM/ROM/price, update current brand context
      if (rawLine.split(/\s+/).length <= 4 && !hasRamRom) {
        currentBrand = detectedBrand;
        // Check if there is also a price on the brand header line itself
        if (!hasPrice) {
          continue; // It's purely a brand context header line
        }
      } else if (!currentBrand) {
        currentBrand = detectedBrand;
      }
    }

    // If line has no digits at all, skip
    if (!/\d/.test(rawLine)) {
      skippedLines.push({ line: rawLine, lineNumber: i + 1, reason: 'Header/non-product text' });
      continue;
    }

    let line = rawLine;

    // 2. Extract Price
    let price = null;

    // A) Match rupee symbol with amount: ₹11,900, Rs 14500, etc.
    const symbolMatch = line.match(/(?:₹|rs\.?|inr)\s*([\d,]+)/i);
    if (symbolMatch) {
      const val = parseFloat(symbolMatch[1].replace(/,/g, ''));
      if (val >= 1000 && val <= 500000) {
        price = val;
        line = line.replace(symbolMatch[0], ' ');
      }
    }

    // B) If no price yet, look for 4 to 6 digit numbers (with optional commas)
    if (!price) {
      // Find all number tokens in line
      const matches = Array.from(line.matchAll(/\b(\d{1,3}(?:,\d{3})+|\d{4,6})\b/g));
      if (matches.length > 0) {
        // Iterate backwards from end of line (price is almost always at end of product line)
        for (let m = matches.length - 1; m >= 0; m--) {
          const match = matches[m];
          const val = parseFloat(match[1].replace(/,/g, ''));
          // Check if this number is likely a price (>= 1000 and <= 500000)
          if (val >= 1000 && val <= 500000) {
            price = val;
            line = line.slice(0, match.index) + ' ' + line.slice(match.index + match[0].length);
            break;
          }
        }
      }
    }

    if (!price || isNaN(price) || price < 500) {
      skippedLines.push({ line: rawLine, lineNumber: i + 1, reason: 'Could not extract valid price' });
      continue;
    }

    // 3. Extract Variant (RAM / Storage)
    let variant = '';

    // A) Slash notation: 3/64, 4/128, 8/256, 12/256, 16/512, etc.
    const slashVariantMatch = line.match(/\b(\d{1,2})\s*[\/:]\s*(\d{2,4})\b/);
    if (slashVariantMatch) {
      variant = `${slashVariantMatch[1]}/${slashVariantMatch[2]}`;
      line = line.replace(slashVariantMatch[0], ' ');
    } else {
      // B) Standard GB/TB notation: 128GB, 256GB, 1TB
      const gbMatch = line.match(/\b(\d{2,4}\s*(?:gb|tb))\b/i);
      if (gbMatch) {
        variant = gbMatch[1].toUpperCase().replace(/\s+/, '');
        line = line.replace(gbMatch[0], ' ');
      }
    }

    // 4. Clean up Line to form Model Name
    // Remove bullets, dashes, tildes, stars, colons, dots at end or isolated dots
    line = line
      .replace(/^[\*\-\•\–\—\:\,\.\s]+/, '')
      .replace(/[\*\-\•\–\—\:\,\.\s]+$/, '')
      .replace(/\b(fresh|sealed|indian|demo|stock|all fresh|pcs|box|rate|price|qty|available)\b/gi, ' ')
      .replace(/\s*\.\s*/g, ' ')
      .replace(/[\s\-\–\—\:]+/g, ' ')
      .trim();

    // Standardize 4G/5G flags
    let has5G = /\b5g\b/i.test(rawLine) || /\b5g\b/i.test(line);
    let has4G = /\b4g\b/i.test(rawLine) || /\b4g\b/i.test(line);

    // Remove 4G/5G from line copy so we can cleanly standardize it
    line = line.replace(/\b5g\b/gi, '').replace(/\b4g\b/gi, '').replace(/\s+/g, ' ').trim();

    // Remove Brand Prefixes like "Mi", "Xiaomi", "Redmi", "Poco" if redundant from model line
    line = line.replace(/^(mi|xiaomi|redmi|poco|samsung|realme|apple|vivo|oppo|oneplus|infinix|tecno|motorola|moto)\b/gi, '').trim();

    // Standardize model spacing: Note15 -> Note 15, Note14Pro -> Note 14 Pro
    line = line
      .replace(/\bNote(\d+)/gi, 'Note $1')
      .replace(/\bNote\s*(\d+)\s*Pro\b/gi, 'Note $1 Pro')
      .replace(/\b(\d+)se\b/gi, '$1 SE')
      .replace(/\b(\d+)SE\b/gi, '$1 SE')
      .replace(/\b([a-z]\d+)([a-z])\b/gi, (m, p1, p2) => `${p1}${p2.toUpperCase()}`);

    // Known 5G series default check if not explicitly 4G
    const ALWAYS_5G_MODELS = ['15a', '15c', '15', 'c75', 'c85', 'c85x', 'm7', 'm8', 'm7 plus', 'turbo 5', 's25', 's24'];
    const lowerLineCheck = line.toLowerCase();
    if (!has4G && !has5G && ALWAYS_5G_MODELS.some(m => lowerLineCheck === m || lowerLineCheck.startsWith(m + ' '))) {
      has5G = true;
    }

    // Append 5G or 4G to Model Name if present
    if (has5G && !line.toUpperCase().includes('5G')) {
      line = `${line} 5G`;
    } else if (has4G && !line.toUpperCase().includes('4G')) {
      line = `${line} 4G`;
    }

    // Convert Model Name to UPPERCASE to prevent case-sensitive duplicates (e.g., 'abc' vs 'ABC', '15c' vs '15C')
    let rawModelStr = line.replace(/\s+/g, ' ').toUpperCase().trim();

    // Determine Brand if available
    let brand = currentBrand || '';
    if (!brand) {
      const bFromLine = detectBrandFromLine(rawLine);
      if (bFromLine) brand = bFromLine;
    }

    // Allow matching even if company/brand name is missing:
    // If brand is available, phoneName is BRAND MODEL (e.g. "REDMI 15C 5G")
    // If brand is NOT available, phoneName is simply MODEL (e.g. "15C 5G" or "ABC")
    let phoneName = brand ? `${brand} ${rawModelStr}`.replace(/\s+/g, ' ').trim() : rawModelStr;
    let model = rawModelStr;

    // Check custom database normalization rules
    const lowerFull = phoneName.toLowerCase();
    for (const [pattern, normName] of normMap.entries()) {
      if (lowerFull.includes(pattern)) {
        phoneName = normName.toUpperCase();
        break;
      }
    }

    validRecords.push({
      phoneName: phoneName.toUpperCase(),
      model: model.toUpperCase(),
      variant: variant.toUpperCase(),
      color: '',
      price,
      rawText: rawLine,
    });
  }

  return { validRecords, skippedLines };
}

module.exports = {
  parseRawMessage,
};
