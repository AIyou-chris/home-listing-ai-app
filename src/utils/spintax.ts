/**
 * Parses a string containing Spintax (Spin Syntax) and returns a resolved string
 * with random selections.
 * 
 * Example: "{Hello|Hi|Hey} world" -> "Hello world" OR "Hi world" OR "Hey world"
 * Supports nested spintax: "{A|{B|C}}"
 */
export const parseSpintax = (text: string): string => {
    if (!text) return '';



    // Regex to find the innermost spintax patterns first? 
    // Actually, a simple regex /\{[^{}]*\}/g finds the innermost non-nested braces.
    // We can loop until no braces remain.

    let result = text;
    // Keep spinning until no braces left (or max iterations to prevent infinite loops)
    let safety = 0;
    while (/\{[^{}]*?\}/.test(result) && safety < 100) {
        result = result.replace(/\{([^{}]*?)\}/g, (_match, inner) => {
            const options = inner.split('|');
            return options[Math.floor(Math.random() * options.length)];
        });
        safety++;
    }

    return result;
};

/**
 * Validates if the spintax is well-formed (balanced braces)
 */
export const validateSpintax = (text: string): boolean => {
    let depth = 0;
    for (const char of text) {
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (depth < 0) return false;
    }
    return depth === 0;
};
