/**
 * Parser utility for Wholesaler WhatsApp raw messages
 */

// Common color keywords to detect
const COMMON_COLORS = [
  'black', 'white', 'silver', 'blue', 'green', 'pink', 'purple', 'yellow', 'red',
  'gold', 'grey', 'gray', 'graphite', 'titanium', 'natural titanium', 'desert titanium',
  'black titanium', 'white titanium', 'copper', 'orange', 'violet', 'cream', 'mint',
  'starlight', 'midnight', 'sierra blue', 'deep purple', 'alpine green', 'space black',
  'space grey', 'space gray', 'cosmic black', 'sky blue', 'bronze'
];

/**
 * Parse a raw text message into individual phone records
 * @param {string} rawText 
 * @param {Array} normalizationRules Array of { rawPattern, normalizedName }
 */
function parseRawMessage(rawText, normalizationRules = []) {
  if (!rawText || typeof rawText !== 'string') {
    return { validRecords: [], skippedLines: [] };
  }

  const lines = rawText.split(/\r?\n/);
  const validRecords = [];
  const skippedLines = [];

  // Build normalization lookup map
  const normMap = new Map();
  normalizationRules.forEach((rule) => {
    if (rule.rawPattern && rule.normalizedName) {
      normMap.set(rule.rawPattern.toLowerCase().trim(), rule.normalizedName.trim());
    }
  });

  // Default hardcoded normalization fallbacks
  const defaultNorms = [
    { pattern: /^iphone\s*16\b/i, name: 'Apple iPhone 16' },
    { pattern: /^iph16\b/i, name: 'Apple iPhone 16' },
    { pattern: /^iphone\s*16\s*pro\b/i, name: 'Apple iPhone 16 Pro' },
    { pattern: /^iphone\s*16\s*pro\s*max\b/i, name: 'Apple iPhone 16 Pro Max' },
    { pattern: /^iphone\s*15\b/i, name: 'Apple iPhone 15' },
    { pattern: /^iph15\b/i, name: 'Apple iPhone 15' },
    { pattern: /^iphone\s*14\b/i, name: 'Apple iPhone 14' },
    { pattern: /^s25\b/i, name: 'Samsung Galaxy S25' },
    { pattern: /^s25\s*ultra\b/i, name: 'Samsung Galaxy S25 Ultra' },
    { pattern: /^s24\b/i, name: 'Samsung Galaxy S24' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // Ignore blank lines silently

    // Check if line contains any digits (prices or models)
    if (!/\d/.test(rawLine)) {
      skippedLines.push({ line: rawLine, lineNumber: i + 1, reason: 'Header/non-product text (no numbers found)' });
      continue;
    }

    let line = rawLine;

    // 1. Extract Price (at end of line or after separator like -, :, ₹, Rs)
    let price = null;
    // Match patterns like "- 62500", ": 62500", "Rs 62500", "₹62500", or standalone number at end
    const priceMatch = line.match(/(?:[-:\s₹]|rs\.?|inr)?\s*(\d{2,3}(?:[,\s]\d{3})+|\d{4,7})(?:\s*\/-|\s*\.\d{2})?\s*$/i);
    
    if (priceMatch) {
      const rawPriceStr = priceMatch[1].replace(/[,\s]/g, '');
      price = parseFloat(rawPriceStr);
      // Remove price string from line working copy
      line = line.substring(0, priceMatch.index).trim();
    } else {
      // Try finding any 4-6 digit number if trailing match failed
      const numbers = rawLine.match(/\b\d{4,6}\b/g);
      if (numbers && numbers.length > 0) {
        price = parseFloat(numbers[numbers.length - 1]);
        line = line.replace(numbers[numbers.length - 1], '').trim();
      }
    }

    if (!price || isNaN(price) || price < 100) {
      skippedLines.push({ line: rawLine, lineNumber: i + 1, reason: 'Could not extract valid price' });
      continue;
    }

    // Clean up trailing separators left over after price extraction
    line = line.replace(/[-:\/=]+$/, '').trim();

    // 2. Extract Variant (Storage - e.g., 128GB, 256GB, 1TB, 512GB)
    let variant = '';
    const variantMatch = line.match(/\b(\d+\s*(?:gb|tb))\b/i) || line.match(/\b(128|256|512|64|32|16|1)\b(?!\s*pro|\s*plus)/i);
    if (variantMatch) {
      variant = variantMatch[1].toUpperCase();
      if (!/gb|tb/i.test(variant)) {
        variant += 'GB';
      }
      // Remove variant from line
      line = line.replace(variantMatch[0], '').trim();
    }

    // 3. Extract Color
    let color = '';
    const words = line.split(/\s+/);
    const remainingWords = [];

    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (COMMON_COLORS.includes(cleanWord) && !color) {
        // Capitalize first letter
        color = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
      } else {
        remainingWords.push(word);
      }
    }

    let phoneStr = remainingWords.join(' ').replace(/[-:]+/g, ' ').replace(/\s+/g, ' ').trim();

    if (!phoneStr) {
      skippedLines.push({ line: rawLine, lineNumber: i + 1, reason: 'Could not extract product name' });
      continue;
    }

    // 4. Product Normalization
    let normalizedPhoneName = phoneStr;
    const lowerPhone = phoneStr.toLowerCase();

    // Check custom normalization database rules first
    let matchedRule = false;
    for (const [pattern, normName] of normMap.entries()) {
      if (lowerPhone.includes(pattern)) {
        normalizedPhoneName = normName;
        matchedRule = true;
        break;
      }
    }

    // Default built-in rules if no custom rule matched
    if (!matchedRule) {
      for (const norm of defaultNorms) {
        if (norm.pattern.test(phoneStr)) {
          normalizedPhoneName = norm.name;
          matchedRule = true;
          break;
        }
      }
    }

    // 5. Separate Phone Name and Model
    // E.g., "Apple iPhone 16" -> Phone Name: "Apple iPhone", Model: "16"
    // E.g., "Samsung S25" -> Phone Name: "Samsung Galaxy", Model: "S25"
    let phoneName = normalizedPhoneName;
    let model = '';

    const modelMatch = normalizedPhoneName.match(/^(.*?)\s+([A-Z0-9]+(?:\s*(?:Pro|Plus|Max|Ultra|FE|Lite| 5G))*)$/i);
    if (modelMatch && modelMatch[1] && modelMatch[2]) {
      phoneName = modelMatch[1].trim();
      model = modelMatch[2].trim();
    }

    validRecords.push({
      phoneName,
      model,
      variant,
      color,
      price,
      rawText: rawLine,
    });
  }

  return { validRecords, skippedLines };
}

module.exports = {
  parseRawMessage,
};
