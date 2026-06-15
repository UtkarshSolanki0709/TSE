
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, 
          matrix[i][j - 1] + 1,     
          matrix[i - 1][j] + 1      
        );
      }
    }
  }

  return matrix[a.length][b.length];
}


export function getSuggestion(term: string, vocabulary: string[], maxDistance = 2): string | null {
  if (term.length < 3) return null;
  
  let bestMatch: string | null = null;
  let minDistance = maxDistance + 1;

  // Optimization: Only check words that starts with same letter or are of similar length
  const candidates = vocabulary.filter(v => 
    Math.abs(v.length - term.length) <= maxDistance &&
    (v[0] === term[0] || v[1] === term[0] || v[0] === term[1])
  );

  for (const candidate of candidates) {
    const dist = levenshteinDistance(term, candidate);
    if (dist > 0 && dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}
