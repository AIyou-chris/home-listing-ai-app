/**
 * Robust CSV Line Parser
 * Handles quoted fields properly (e.g. "Smith, John", "123 Main St")
 */
function parseCSVLine(text) {
    const result = [];
    let start = 0;
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"') {
            inQuotes = !inQuotes;
        } else if (text[i] === ',' && !inQuotes) {
            let field = text.substring(start, i).trim();
            if (field.startsWith('"') && field.endsWith('"')) {
                field = field.substring(1, field.length - 1).replace(/""/g, '"');
            }
            result.push(field);
            start = i + 1;
        }
    }
    let lastField = text.substring(start).trim();
    if (lastField.startsWith('"') && lastField.endsWith('"')) {
        lastField = lastField.substring(1, lastField.length - 1).replace(/""/g, '"');
    }
    result.push(lastField);
    return result;
}

module.exports = { parseCSVLine };
