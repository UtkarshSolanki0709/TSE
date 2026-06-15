export interface ParsedQuery {
  includeTerms: string[];
  excludeTerms: string[];
  exactPhrases: string[];
  siteFilter?: string;
}

export function parseQuery(raw: string): ParsedQuery {
  const includeTerms: string[] = [];
  const excludeTerms: string[] = [];
  const exactPhrases: string[] = [];
  let siteFilter: string | undefined;

  const tokens = tokenizeWithQuotes(raw);

  for (const token of tokens) {
    if (token.startsWith('"') && token.endsWith('"') && token.length > 1) {
      exactPhrases.push(token.slice(1, -1).toLowerCase());
    } else if (token.startsWith('-') && token.length > 1) {
      excludeTerms.push(token.slice(1).toLowerCase());
    } else if (token.startsWith('site:') && token.length > 5) {
      siteFilter = token.slice(5).toLowerCase();
    } else {
      includeTerms.push(token.toLowerCase());
    }
  }

  return { includeTerms, excludeTerms, exactPhrases, siteFilter };
}

function tokenizeWithQuotes(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const ch of input) {
    if (ch === '"') {
      if (inQuotes) {
        tokens.push(current + '"');
        current = '';
        inQuotes = false;
      } else {
        if (current) {
          tokens.push(current);
          current = '';
        }
        current = '"';
        inQuotes = true;
      }
    } else if (ch === ' ' && !inQuotes) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
