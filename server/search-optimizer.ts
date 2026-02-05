/**
 * Search Query Optimizer - Creates intelligent search queries for educational content
 */

export class SearchOptimizer {
  
  /**
   * Extracts key terms from title and content for better search queries
   */
  private extractKeyTerms(title: string, content: string, subjectContext?: string): string[] {
    const allText = `${title} ${content} ${subjectContext || ''}`.toLowerCase();
    
    // Hungarian technical terms and educational keywords
    const technicalTerms = [
      'hegesztés', 'szerkezet', 'anyag', 'technológia', 'módszer', 'eljárás',
      'biztonság', 'minőség', 'ellenőrzés', 'mérés', 'tulajdonság', 'alkalmazás',
      'gyakorlat', 'elméleti', 'szakmai', 'ismeretek', 'készségek', 'kompetencia'
    ];
    
    const foundTerms = technicalTerms.filter(term => allText.includes(term));
    
    // Extract important words from title (usually the most relevant)
    const titleWords = title.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['alapok', 'bevezetés', 'tananyag', 'modul'].includes(word));
    
    return Array.from(new Set([...titleWords, ...foundTerms]));
  }

  /**
   * Generates optimized search queries for concise content
   */
  generateConciseQueries(title: string, content: string, subjectContext?: string): string[] {
    const keyTerms = this.extractKeyTerms(title, content, subjectContext);
    
    const queries = [
      // Primary query with main topic
      `${title} ${subjectContext || ''} tananyag`,
      
      // Educational methodology query
      `${keyTerms.slice(0, 2).join(' ')} oktatás módszertan`,
      
      // Professional training query
      `${subjectContext || keyTerms[0]} szakmai képzés alapok`,
      
      // Practical application query
      `${keyTerms.slice(0, 2).join(' ')} gyakorlati alkalmazás`
    ];

    return queries.filter(q => q.trim().length > 10); // Filter out too short queries
  }

  /**
   * Generates comprehensive search queries for detailed content
   */
  generateDetailedQueries(title: string, content: string, subjectContext?: string): string[] {
    const keyTerms = this.extractKeyTerms(title, content, subjectContext);
    
    const queries = [
      // Detailed explanation query
      `${title} ${subjectContext || ''} részletes magyarázat`,
      
      // Theoretical background query
      `${keyTerms.slice(0, 2).join(' ')} elméleti háttér szakmai`,
      
      // Technical specifications query
      `${keyTerms.slice(0, 2).join(' ')} technikai követelmények`,
      
      // Practical examples query
      `${subjectContext || keyTerms[0]} gyakorlati példák esettanulmány`,
      
      // Industry standards query
      `${keyTerms.slice(0, 2).join(' ')} szabványok előírások`,
      
      // Professional competencies query
      `${subjectContext || keyTerms[0]} szakmai kompetenciák készségek`
    ];

    return queries.filter(q => q.trim().length > 10);
  }

  /**
   * Optimizes a single query for better search results
   */
  optimizeQuery(query: string): string {
    // Remove AI-specific instructions and formatting
    let optimized = query
      .replace(/Elemezd.*JSON formátumban:/g, '')
      .replace(/Válaszolj.*formátumban:/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\n+/g, ' ')
      .trim();

    // Keep only the essential search terms (max 200 chars)
    if (optimized.length > 200) {
      const words = optimized.split(/\s+/);
      const essentialWords = words.filter(word => 
        word.length > 3 && 
        !['elemezd', 'azonosítsd', 'válaszolj', 'formátumban'].includes(word.toLowerCase())
      );
      
      optimized = essentialWords.slice(0, 15).join(' ');
    }

    return optimized;
  }
}

export const searchOptimizer = new SearchOptimizer();