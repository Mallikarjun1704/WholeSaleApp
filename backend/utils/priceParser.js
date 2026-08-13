/**
 * Advanced Parser utility for Wholesaler WhatsApp raw messages
 * Standardizes brands, model names, RAM/Storage variants, and price extraction.
 */

const KNOWN_BRANDS = [
  { key: 'redmi', name: 'Redmi' },
  { key: 'mi', name: 'Redmi' },
  { key: 'xiaomi', name: 'Redmi' },
  { key: 'poco', name: 'Poco' },
  { key: 'samsung', name: 'Samsung' },
  { key: 'realme', name: 'Realme' },
  { key: 'apple', name: 'Apple' },
  { key: 'iphone', name: 'Apple' },
  { key: 'vivo', name: 'Vivo' },
  { key: 'oppo', name: 'Oppo' },
  { key: 'oneplus', name: 'OnePlus' },
  { key: 'iqoo', name: 'iQOO' },
  { key: 'motorola', name: 'Motorola' },
  { key: 'moto', name: 'Motorola' },
  { key: 'infinix', name: 'Infinix' },
  { key: 'techno', name: 'Tecno' },
  { key: 'tecno', name: 'Tecno' },
  { key: 'nokia', name: 'Nokia' },
  { key: 'nothing', name: 'Nothing' },
  { key: 'google', name: 'Google' },
  { key: 'pixel', name: 'Google' },
];

function detectBrandFromLine(line) {
  const clean = line.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
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
      normMap.set(rule.rawPattern.toLowerCase().trim(), rule.normalizedName.trim());
    }
  });

  let currentBrand = '';

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // Ignore blank lines

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
      .replace(/fresh|sealed|indian|demo|stock|all fresh/gi, ' ')
      .replace(/\s*\.\s*/g, ' ')
      .replace(/[\s\-\–\—\:]+/g, ' ')
      .trim();

    // Standardize 4G/5G flags
    let has5G = /\b5g\b/i.test(rawLine) || /\b5g\b/i.test(line);
    let has4G = /\b4g\b/i.test(rawLine) || /\b4g\b/i.test(line);

    // Remove 4G/5G from line copy so we can cleanly standardize it
    line = line.replace(/\b5g\b/gi, '').replace(/\b4g\b/gi, '').replace(/\s+/g, ' ').trim();

    // Remove Brand Prefixes like "Mi", "Xiaomi", "Redmi", "Poco" if redundant
    line = line.replace(/^(mi|xiaomi|redmi|poco|samsung|realme|apple|vivo|oppo)\b/gi, '').trim();

    // Standardize model spacing: Note15 -> Note 15, Note14Pro -> Note 14 Pro, C85x -> C85X
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

    // Capitalize words in model name
    line = line.split(/\s+/).map(w => w.toUpperCase() === w ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    // Append 5G or 4G to Model Name if present
    if (has5G && !line.includes('5G')) {
      line = `${line} 5G`;
    } else if (has4G && !line.includes('4G')) {
      line = `${line} 4G`;
    }

    let rawModelStr = line.trim();

    // Determine final Brand
    let brand = currentBrand || 'Other';
    if (!brand || brand === 'Other') {
      const bFromLine = detectBrandFromLine(rawLine);
      if (bFromLine) brand = bFromLine;
    }

    // Construct Canonical Phone Name & Model
    let phoneName = `${brand} ${rawModelStr}`.replace(/\s+/g, ' ').trim();
    let model = rawModelStr;

    // Check custom database normalization rules
    const lowerFull = phoneName.toLowerCase();
    for (const [pattern, normName] of normMap.entries()) {
      if (lowerFull.includes(pattern)) {
        phoneName = normName;
        break;
      }
    }

    validRecords.push({
      phoneName,
      model,
      variant,
      color: '', // default empty if not specified
      price,
      rawText: rawLine,
    });
  }

  return { validRecords, skippedLines };
}

module.exports = {
  parseRawMessage,
};
