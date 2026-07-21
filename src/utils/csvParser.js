/**
 * A lightweight, robust CSV parser for browser environments.
 * Handles:
 * - Commas within double quotes
 * - Escaped double quotes ("" -> ")
 * - Line breaks inside quoted strings
 * - UTF-8 BOM removal
 * - Trimming of keys and values
 */
export function parseCSV(text) {
  if (!text) return [];

  // Strip UTF-8 BOM if present
  if (text.startsWith("\uFEFF")) {
    text = text.substring(1);
  }

  const lines = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    const prev = text[i - 1];

    if (c === '"') {
      if (prev === '\\') {
        // Backslash escaped quote
        row[row.length - 1] += '"';
      } else if (inQuotes && next === '"') {
        // Escaped quote
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        // Toggle quote flag
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      // Column boundary
      row.push("");
    } else if ((c === "\r" || c === "\n") && !inQuotes) {
      // Row boundary
      if (c === "\r" && next === "\n") {
        i++; // skip LF after CR
      }
      lines.push(row);
      row = [""];
    } else {
      // Normal character
      row[row.length - 1] += c;
    }
  }

  // Push final row if not empty
  if (row.length > 1 || row[0] !== "") {
    lines.push(row);
  }

  if (lines.length < 2) return [];

  // Extract headers and map lines to objects
  const headers = lines[0].map((h) => h.trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i];
    // Skip empty lines
    if (values.length === 1 && values[0] === "") continue;

    const obj = {};
    headers.forEach((header, index) => {
      const val = values[index] !== undefined ? values[index].trim() : "";
      obj[header] = val;
    });
    result.push(obj);
  }

  return result;
}
