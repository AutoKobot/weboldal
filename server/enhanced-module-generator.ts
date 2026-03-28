import { storage } from './storage';
import { multiApiService } from './multiApiService';
import { generateChatResponse } from './openai';
import OpenAI from 'openai';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface EnhancedModuleContent {
  conciseVersion: string;
  detailedVersion: string;
  keyConceptsWithVideos: Array<{
    concept: string;
    definition: string;
    youtubeVideos: Array<{
      title: string;
      videoId: string;
      description: string;
      url: string;
    }>;
    wikipediaLinks?: Array<{
      text: string;
      url: string;
      description?: string;
    }>;
  }>;
  generatedQuizzes?: Array<Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>>;
}

export class EnhancedModuleGenerator {
  private youtubeCache: Map<string, any[]> = new Map();
  private lastYouTubeCall: number = 0;
  private readonly YOUTUBE_RATE_LIMIT = 1000; // 1 second between calls

  // Performance optimization settings
  private async getOptimizationSettings() {
    const setting = await storage.getSystemSetting('ai-generation-mode');
    const mode = setting?.value || 'balanced';

    switch (mode) {
      case 'fast':
        return {
          maxBoldKeywords: 2,
          boldKeywordDelay: 300,
          enableWebSearch: false,
          enableBoldLinking: true,
          parallelProcessing: true
        };
      case 'quality':
        return {
          maxBoldKeywords: 5,
          boldKeywordDelay: 1500,
          enableWebSearch: true,
          enableBoldLinking: true,
          parallelProcessing: false
        };
      default: // balanced
        return {
          maxBoldKeywords: 3,
          boldKeywordDelay: 500,
          enableWebSearch: true,
          enableBoldLinking: true,
          parallelProcessing: true
        };
    }
  }

  /**
   * Load specialized prompts from database
   */
  private async loadPrompts(): Promise<{
    youtubePrompt: string;
    wikipediaPrompt: string;
    internetContentPrompt: string;
    conciseContentPrompt: string;
  }> {
    const [youtubePromptSetting, wikipediaPromptSetting, internetContentPromptSetting, conciseContentPromptSetting] = await Promise.all([
      storage.getSystemSetting('ai_youtube_prompt'),
      storage.getSystemSetting('ai_wikipedia_prompt'),
      storage.getSystemSetting('ai_internet_content_prompt'),
      storage.getSystemSetting('concise-content-prompt')
    ]);

    return {
      youtubePrompt: youtubePromptSetting?.value || 'Javasolj 2-3 konkrét, létező vagy erősen valószínű YouTube videó CÍMET ehhez a tananyaghoz JSON tömbben. A címek legyenek pontosak és szakmailag relevánsak (pl. "Műszaki rajz alapjai - Vetületek"). Ne használj túl általános kifejezéseket!\n\nCím: {title}\nTartalom: {content}',
      wikipediaPrompt: wikipediaPromptSetting?.value || 'Azonosítsd a modul legfontosabb szakmai kifejezéseit és fogalmait, amelyekhez Wikipedia linkeket kell hozzáadni. Csak azokat a kifejezéseket válaszd ki, amelyek valóban fontosak a témához. Modulcím: {title}, Tartalom: {content}',
      internetContentPrompt: internetContentPromptSetting?.value || 'Generálj frissített, részletes tartalmat az internet segítségével using actual information. KÖTELEZŐ: A magyarázatot vizuálisan is támaszd alá legalább egy Mermaid diagrammal (pl. folyamatábra, graph TD vagy elmetérkép)! A diagram segítse a megértést. Modulcím: {title}, Eredeti tartalom: {content}',
      conciseContentPrompt: conciseContentPromptSetting?.value || 'Készíts tömör, lényegre törő tananyagot maximum 250-300 szóban:\n\nCím: {title}\nEredeti tartalom: {content}\nSzakma: {profession}\nTantárgy: {subject}\n\nKÖVETELMÉNYEK:\n- MAXIMUM 250-300 szó\n- Csak a legfontosabb információk\n- Egyszerű, érthető nyelvezet\n- Markdown formázás\n- Gyakorlati fókusz\n- NE ismételd meg a részletes verziót\n- HA a téma engedi (pl. folyamat, hierarchia), illessz be egy EGYSZERŰ Mermaid diagramot (graph TD) a vizuális szemléltetéshez!\n\nVálasz:'
    };
  }

  async generateEnhancedModule(
    title: string,
    basicContent: string,
    subjectContext?: string,
    customSystemMessage?: string,
    subjectName?: string,
    professionName?: string
  ): Promise<EnhancedModuleContent> {
    const timeout = 300000; // 5 minute timeout

    return Promise.race([
      this.performEnhancement(title, basicContent, subjectContext, customSystemMessage, subjectName, professionName),
      new Promise<EnhancedModuleContent>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout after 5 minutes')), timeout)
      )
    ]).catch(error => {
      console.error('Enhanced module generation error:', error);

      // Return fallback with original content
      return {
        conciseVersion: basicContent,
        detailedVersion: basicContent,
        keyConceptsWithVideos: []
      };
    });
  }

  private async performEnhancement(
    title: string,
    basicContent: string,
    subjectContext?: string,
    customSystemMessage?: string,
    subjectName?: string,
    professionName?: string
  ): Promise<EnhancedModuleContent> {
    // Load specialized prompts from database
    const prompts = await this.loadPrompts();

    // SEQUENTIAL PROCESSING - Each step builds on the previous result

    // Step 1: Generate internet-enhanced detailed content using original content
    console.log('🔥 SEQUENTIAL AI STEP 1: Generating internet-enhanced detailed content...');
    console.log('📝 Original content length:', basicContent.length);
    const internetEnhancedDetailed = await this.generateInternetEnhancedContent(title, basicContent, 'detailed', prompts.internetContentPrompt, subjectName, professionName);
    console.log('✅ STEP 1 COMPLETED - Enhanced detailed content length:', internetEnhancedDetailed.length);

    // Step 1B: Generate concise version using original content and dedicated prompt
    console.log('🔥 SEQUENTIAL AI STEP 1B: Generating concise version with dedicated prompt...');

    // Use admin-configured prompt for concise content
    const strictConcisePrompt = prompts.conciseContentPrompt
      .replace('{title}', title)
      .replace('{content}', basicContent)
      .replace('{profession}', professionName || 'Általános')
      .replace('{subject}', subjectName || 'Általános');

    console.log('📝 Concise generation started with admin prompt');
    const conciseResponse = await generateChatResponse(strictConcisePrompt, 'chat');
    const internetEnhancedConcise = conciseResponse.message.trim();
    console.log('✅ STEP 1B COMPLETED - Concise content length:', internetEnhancedConcise.length);

    // Use the full concise content without truncation
    let finalConciseContent = internetEnhancedConcise;
    console.log('📝 Using full concise content without character limits');

    // Step 2: Add relevant web search results to the internet-enhanced content
    console.log('🔥 SEQUENTIAL AI STEP 2: Adding relevant web search results to enhanced content...');

    // Detect professional field once and use consistently
    const detectedField = this.detectProfessionalField(title, internetEnhancedDetailed, subjectName, professionName);
    console.log(`🎯 Detected field for web search: ${detectedField}`);

    // Step 2A: Add web search content first
    console.log('🔗 STEP 2A: Adding web search content... (DISABLED due to DataForSEO unavailability)');
    // const webEnhancedConcise = await this.addWebSearchContent(finalConciseContent, title, detectedField);
    // const webEnhancedDetailed = await this.addWebSearchContent(internetEnhancedDetailed, title, detectedField);

    // Bypass web search
    const webEnhancedConcise = finalConciseContent;
    const webEnhancedDetailed = internetEnhancedDetailed;

    console.log('✅ STEP 2A COMPLETED - Web search content integrated');

    // Step 2B: Link bold keywords AFTER web content integration
    console.log('🔗 STEP 2B: Linking bold keywords with web sources...');
    console.log('🔍 STEP 2B DEBUG: About to process concise content for bold linking...');
    const boldLinkedConcise = await this.linkBoldKeywordsSimplified(webEnhancedConcise, title);
    console.log('🔍 STEP 2B DEBUG: About to process detailed content for bold linking...');
    const boldLinkedDetailed = await this.linkBoldKeywordsSimplified(webEnhancedDetailed, title);

    console.log('✅ STEP 2B COMPLETED - Bold keywords linked');
    console.log('📋 Concise content after bold linking:', boldLinkedConcise.substring(0, 200) + '...');
    console.log('📋 Detailed content after bold linking:', boldLinkedDetailed.substring(0, 200) + '...');

    // DEBUG: Check if bold links are actually present
    const conciseLinkCount = (boldLinkedConcise.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    const detailedLinkCount = (boldLinkedDetailed.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    console.log(`🔗 DEBUG: Concise content has ${conciseLinkCount} bold links`);
    console.log(`🔗 DEBUG: Detailed content has ${detailedLinkCount} bold links`);

    if (conciseLinkCount > 0) {
      console.log(`🔗 DEBUG: First bold link in concise: ${boldLinkedConcise.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/)?.[0]}`);
    }
    if (detailedLinkCount > 0) {
      console.log(`🔗 DEBUG: First bold link in detailed: ${boldLinkedDetailed.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/)?.[0]}`);
    }

    // Step 3: Parallel YouTube, Mermaid and Quiz processing
    console.log('🔥 STEP 3: Parallel YouTube search, Mermaid conversion and Quiz generation...');
    const [youtubeSearchTerms, conciseWithSVG, detailedWithSVG, quizSets] = await Promise.all([
      this.generateYouTubeSearchTerms(title, boldLinkedDetailed, prompts.youtubePrompt, subjectName, professionName),
      this.convertMermaidToSVGImages(boldLinkedConcise),
      this.convertMermaidToSVGImages(boldLinkedDetailed),
      this.generateMultipleQuizSets(title, boldLinkedDetailed)  // Fixed: Use boldLinkedDetailed
    ]);

    console.log('🔍 YouTube search terms generated:', youtubeSearchTerms);
    console.log('📝 Quiz sets generated:', quizSets.length);

    // Step 4: Find YouTube videos (sequential due to API limits)
    console.log('🔥 STEP 4: Finding YouTube videos...');
    const keyConceptsWithVideos = await this.enrichWithYouTubeVideos(youtubeSearchTerms);
    console.log('✅ STEP 4 COMPLETED - YouTube videos found:', keyConceptsWithVideos.length);

    // DEBUG: Final content check before return
    const finalConciseLinkCount = (conciseWithSVG.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    const finalDetailedLinkCount = (detailedWithSVG.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    console.log(`🔗 FINAL DEBUG: Concise version has ${finalConciseLinkCount} bold links`);
    console.log(`🔗 FINAL DEBUG: Detailed version has ${finalDetailedLinkCount} bold links`);

    if (finalConciseLinkCount > 0) {
      console.log(`🔗 FINAL DEBUG: Sample link in concise: ${conciseWithSVG.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/)?.[0]}`);
    }
    if (finalDetailedLinkCount > 0) {
      console.log(`🔗 FINAL DEBUG: Sample link in detailed: ${detailedWithSVG.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/)?.[0]}`);
    }

    return {
      conciseVersion: conciseWithSVG,
      detailedVersion: detailedWithSVG,
      keyConceptsWithVideos,
      generatedQuizzes: quizSets
    };
  }

  private async extractKeyConcepts(
    title: string,
    content: string,
    subjectContext?: string
  ): Promise<string[]> {
    const prompt = `
Elemezd az alábbi tananyag tartalmat és azonosítsd a legfontosabb kulcsfogalmakat, alapanyagokat és technikai elemeket.

Modul címe: ${title}
${subjectContext ? `Tantárgy kontextus: ${subjectContext}` : ''}

Tartalom:
${content}

Keress különösen:
- Főbb alapanyagokat (pl. paprika, paradicsom, hagyma, kolbász)
- Technikai fogalmakat és eljárásokat
- Kulcsfontosságú eszközöket vagy módszereket
- Szakmai terminológiákat
- Konkrét anyagokat, összetevőket

Válaszolj JSON formátumban:
{
  "keyConcepts": ["fogalom1", "alapanyag1", "technika1", "fogalom2"]
}

Maximum 8 kulcsfogalom, beleértve az alapanyagokat és technikai elemeket.
`;

    try {
      const response = await generateChatResponse(prompt, 'chat');
      const parsed = JSON.parse(response.message);
      return parsed.keyConcepts || [];
    } catch (error) {
      console.error('Key concept extraction error:', error);
      // Return basic fallback concepts from title
      return [title];
    }
  }

  private async generateConciseVersionWithSearch(
    title: string,
    originalContent: string,
    subjectContext?: string,
    customSystemMessage?: string
  ): Promise<string> {
    // Load concise-specific prompt from database
    const prompts = await this.loadPrompts();
    const concisePrompt = prompts.conciseContentPrompt || `Készíts tömör, szakmai összefoglalót az alábbi tananyagból. Maximum 200 szó, csak a lényeget tartalmazza. Használj markdown formázást és emeld ki **vastagon** a kulcsfogalmakat.`;

    const prompt = `
${concisePrompt}

Cím: ${title}
${subjectContext ? `Kontextus: ${subjectContext}` : ''}

Eredeti tartalom (amit át kell írni tömörre):
${originalContent}

FONTOS: A tömör verzió legyen JELENTŐSEN RÖVIDEBB és EGYSZERŰBB, mint az eredeti!
- Maximum 200 szó
- Csak a legfontosabb információk
- Egyszerű, könnyen érthető megfogalmazás
- Markdown formázás
- **Bold** kiemelés kulcsfogalmakhoz

Válasz csak a tömör tartalommal:`;

    try {
      const { generateChatResponse } = await import('./openai');
      const response = await generateChatResponse(prompt, 'basic_ai_only', undefined, customSystemMessage);

      let generatedContent = response.message;

      // Apply Mermaid syntax fixes but NO Wikipedia links for concise version
      const { fixMermaidSyntax } = await import('./openai');
      generatedContent = fixMermaidSyntax(generatedContent);

      return generatedContent;
    } catch (error) {
      console.error('Concise version generation error:', error);
      return `# ${title}\n\n*Hiba történt a tartalom generálása során.*`;
    }
  }

  /**
   * Generate concise content using dedicated prompt
   */
  private async generateConciseContent(title: string, detailedContent: string, prompt: string): Promise<string> {
    try {
      console.log('🔥 Generating concise content with admin prompt');
      const enhancedPrompt = prompt
        .replace('{title}', title)
        .replace('{content}', detailedContent.substring(0, 1000));

      console.log('📝 Concise prompt being used:', enhancedPrompt.substring(0, 200) + '...');
      const response = await generateChatResponse(enhancedPrompt, 'chat');

      const generatedContent = response.message.trim();
      console.log('✅ Concise content generated, length:', generatedContent.length);

      // Apply Mermaid syntax fixes
      const { fixMermaidSyntax } = await import('./openai');
      return fixMermaidSyntax(generatedContent);

    } catch (error) {
      console.error('Concise content generation error:', error);
      return `# ${title}\n\n*Hiba történt a tömör tartalom generálása során.*`;
    }
  }

  private async generateDetailedVersionWithSearch(
    title: string,
    content: string,
    subjectContext?: string,
    customSystemMessage?: string
  ): Promise<string> {
    const prompt = `
Készíts részletes szakmai tananyagot markdown formázásban:

${title}
${subjectContext ? `Kontextus: ${subjectContext}` : ''}

Alapanyag:
${content}

Követelmények:
- Semmi bevezetőszöveg, csak szakmai tartalom
- Egyszerű, magyarázó nyelvezet
- Fejlett markdown struktúra (táblázatok, listák)
- **Bold** kiemelés kulcsfogalmakhoz
- Wikipedia linkek releváns fogalmakhoz: [fogalom](https://hu.wikipedia.org/wiki/Fogalom)
- 500-800 szó
- Magyar nyelv
- **KÖTELEZŐ: Legalább egy Mermaid diagram (folyamatábra vagy elmetérkép) a vizuális szemléltetéshez!**
- A diagram legyen helyes szintaxisú és a tartalomhoz kapcsolódó.

Válasz csak a formázott tartalommal:

Példa struktúra és elemek:

# Főcím
## Technikai részletek
### Specifikációk

| Paraméter | Minimum | Optimális | Maximum | Megjegyzés |
|-----------|---------|-----------|---------|-------------|
| Érték 1   | X       | Y         | Z       | Leírás     |
| Érték 2   | A       | B         | C       | Magyarázat |

> Fontos információ vagy definíció

> Figyelmeztetés vagy veszély

> Hasznos tipp vagy javaslat

### Folyamat lépései:
- [ ] 1. Előkészítés
- [ ] 2. Végrehajtás  
- [ ] 3. Ellenőrzés

### Folyamatábra (KÖTELEZŐ):
\`\`\`mermaid
graph TD
    A[Kezdés] --> B{Döntés};
    B --> C[Első lépés];
    B --> D[Alternatív út];
    C --> E[Befejezés];
    D --> E;
\`\`\`
- [ ] 4. Befejezés

### Folyamatábra:
` + "```mermaid" + `
flowchart TD
    A[Start] --> B[Előkészítés]
    B --> C[Végrehajtás]
    C --> D[Ellenőrzés]
    D --> E[Vége]
` + "```" + `

### Összehasonlító táblázat:
| Módszer | Előnyök | Hátrányok | Alkalmazás |
|---------|---------|-----------|------------|
| A       | pozitív | negatív   | Használat  |
| B       | előny    | hátrány   | Terület    |
`;

    try {
      // First try to get relevant internet information for detailed content
      const { multiApiService } = await import('./multiApiService');
      let enrichedPrompt = prompt;

      try {
        // Use intelligent search query optimization for detailed content
        const { searchOptimizer } = await import('./search-optimizer');
        const detailedSearchQueries = searchOptimizer.generateDetailedQueries(title, content, subjectContext);

        let allDetailedResults: any[] = [];

        // Search with optimized detailed queries
        for (const searchQuery of detailedSearchQueries) {
          try {
            console.log(`Detailed search for: ${searchQuery}`);
            const results = await multiApiService.searchInternet(searchQuery);
            allDetailedResults = allDetailedResults.concat(results.slice(0, 2));
            if (allDetailedResults.length >= 10) break; // More results for detailed version
          } catch (error: any) {
            console.log(`Detailed search failed for "${searchQuery}":`, error.message);
          }
        }

        const searchResults = allDetailedResults;

        if (searchResults.length > 0) {
          const relevantInfo = searchResults.slice(0, 5).map((result: any) =>
            `**${result.title}**: ${result.snippet}`
          ).join('\n\n');

          enrichedPrompt += `\n\nAktuális szakmai információk az internetről:\n${relevantInfo}\n\nHasználd fel ezeket az információkat a részletes magyarázathoz.`;
        }
      } catch (searchError: any) {
        console.log('Internet search failed, using AI-only approach:', searchError.message);
      }

      const { generateChatResponse } = await import('./openai');
      const response = await generateChatResponse(enrichedPrompt, 'basic_ai_only', undefined, customSystemMessage);

      // Add Wikipedia links to key concepts
      let detailedContent = response.message;
      detailedContent = this.addWikipediaLinks(detailedContent);

      // Apply Mermaid syntax fixes
      const { fixMermaidSyntax } = await import('./openai');
      detailedContent = fixMermaidSyntax(detailedContent);

      return detailedContent;
    } catch (error) {
      console.error('Detailed version generation error:', error);
      return `# ${title}\n\n*Részletes verzió generálása sikertelen volt.*`;
    }
  }

  private async generateConceptDefinitions(
    concepts: string[],
    subjectContext?: string
  ): Promise<Array<{
    concept: string;
    definition: string;
    youtubeVideos: Array<{
      title: string;
      videoId: string;
      description: string;
      url: string;
    }>;
  }>> {
    const enrichedConcepts = [];

    for (const concept of concepts) {
      try {
        // Generate definition for the concept using AI only
        const definitionPrompt = `
Adj egy részletes, szakmai definíciót a következő fogalomra: "${concept}"
${subjectContext ? `Kontextus: ${subjectContext}` : ''}

Válasz formátum: 2-3 mondatos, precíz magyarázat magyar nyelven, amely tartalmazza:
- A fogalom alapvető jelentését
- Gyakorlati alkalmazási területét
- Kapcsolódó fontosabb aspektusokat
`;

        const definitionResponse = await generateChatResponse(definitionPrompt, 'chat');
        const definition = definitionResponse.message;

        // Search for YouTube videos for this concept using AI-extracted keywords
        let youtubeVideos: any[] = [];
        try {
          // Let AI extract the most relevant search terms from module content
          const searchQueries = await this.extractYouTubeSearchTerms(concept, definition, subjectContext);

          const allVideoResults = [];

          for (const searchQuery of searchQueries) {
            try {
              console.log(`Searching YouTube for: ${searchQuery}`);
              const videoResults = await multiApiService.searchYoutube(searchQuery);
              if (videoResults && videoResults.length > 0) {
                allVideoResults.push(...videoResults.slice(0, 2));
              }
            } catch (queryError) {
              console.log(`YouTube search failed for query "${searchQuery}":`, queryError);
            }
          }

          // Remove duplicates based on videoId and take best 3
          const uniqueVideos = allVideoResults.filter((video, index, self) =>
            index === self.findIndex(v =>
              (v.id?.videoId || v.videoId) === (video.id?.videoId || video.videoId)
            )
          );

          if (uniqueVideos.length > 0) {
            youtubeVideos = uniqueVideos.slice(0, 3).map((video: any) => {
              // Handle different YouTube API response structures
              const videoId = video.id?.videoId || video.videoId || '';
              const title = video.snippet?.title || video.title || 'YouTube videó';
              const description = video.snippet?.description || video.description || 'Szakmai tartalom';

              return {
                title: title.substring(0, 100), // Limit title length
                videoId,
                description: description.substring(0, 200), // Limit description length
                url: `https://www.youtube.com/watch?v=${videoId}`
              };
            }).filter(video => video.videoId); // Only include videos with valid IDs
          }
        } catch (youtubeError) {
          console.log(`YouTube search failed for ${concept}:`, youtubeError);
        }

        enrichedConcepts.push({
          concept,
          definition,
          youtubeVideos
        });
      } catch (error) {
        console.error(`Error generating definition for concept: ${concept}`, error);
        enrichedConcepts.push({
          concept,
          definition: `${concept} - szakmai fogalom definíciója`,
          youtubeVideos: [] as any[]
        });
      }
    }

    return enrichedConcepts;
  }

  private async enrichConceptsWithVideos(
    concepts: string[],
    subjectContext?: string,
    customSystemMessage?: string
  ): Promise<Array<{
    concept: string;
    definition: string;
    youtubeVideos: Array<{
      title: string;
      videoId: string;
      description: string;
      url: string;
    }>;
  }>> {
    const enrichedConcepts = [];

    // OPTIMIZATION: Limit to max 3 concepts to reduce API quota usage
    const limitedConcepts = concepts.slice(0, 3);
    console.log(`Processing ${limitedConcepts.length} concepts (limited from ${concepts.length} to conserve YouTube API quota)`);

    for (const concept of limitedConcepts) {
      try {
        // Generate definition for the concept
        const definitionPrompt = `
Adj egy rövid, szakmai definíciót a fogalomra: "${concept}"
${subjectContext ? `Kontextus: ${subjectContext}` : ''}

Követelmények:
- Csak a definíció, semmi bevezetőszöveg
- Egyszerű, magyarázó nyelvezet
- Szakmai pontosság
- 1-2 mondat

Válasz csak a definícióval:`;

        const definitionResponse = await generateChatResponse(definitionPrompt, 'chat');
        const definition = definitionResponse.message;

        // Use optimized cached YouTube search
        const searchQuery = `${concept} oktatás magyar`;
        const youtubeVideos = await this.searchYouTubeWithCache(searchQuery);

        // Generate basic Wikipedia link for this concept
        const encodedConcept = encodeURIComponent(concept.replace(/\s+/g, '_'));
        const wikipediaLinks = [{
          text: concept,
          url: `https://hu.wikipedia.org/wiki/${encodedConcept}`,
          description: `Wikipedia cikk: ${concept}`
        }];

        enrichedConcepts.push({
          concept,
          definition,
          youtubeVideos,
          wikipediaLinks
        });
      } catch (error) {
        console.error(`Error enriching concept: ${concept}`, error);
        // Add concept without enrichment if error occurs
        enrichedConcepts.push({
          concept,
          definition: `${concept} - definíció generálása sikertelen`,
          youtubeVideos: [] as any[],
          wikipediaLinks: []
        });
      }
    }

    return enrichedConcepts;
  }



  /**
   * Detect professional field from content and subject context
   */
  private detectProfessionalField(title: string, content: string, subjectName?: string, professionName?: string): string {
    const combined = (title + ' ' + content + ' ' + (subjectName || '') + ' ' + (professionName || '')).toLowerCase();

    // Define professional field patterns - order matters, most specific first
    const fieldPatterns = {
      // Robotics and automation first - highest priority
      robotics: ['robot', 'elfin', 'automatizál', 'programoz', 'koordinát', 'kinematik', 'szenzor', 'aktuátor', 'kollaboratív', 'mozgási tartomány', 'robotkar', 'integrátor', 'robotrendszer'],
      // Safety and workplace safety
      safety: ['biztonság', 'munkavédelem', 'vészhelyzet', 'óvintézkedés', 'védőeszköz', 'kockázat', 'felelősség', 'normák', 'szabvány', 'iso'],
      // Logistics and transportation
      logistics: ['szállítás', 'csomagolás', 'rögzítés', 'pozicionálás', 'tárolás', 'kezelés'],
      // Industrial and manufacturing
      industrial: ['ipari', 'gyártás', 'termelés', 'üzemeltetés', 'technológia', 'berendezés'],
      // Specific cooking terms - lower priority
      cooking: ['főz', 'étel', 'recept', 'alapanyag', 'konyha', 'gasztronóm', 'lecsó', 'paprika', 'paradicsom', 'hagyma', 'kolbász', 'magyar konyha', 'tradicionális', 'szakács', 'élelmiszer'],
      // Welding with more specific terms
      welding: ['hegeszt', 'varrat', 'elektróda', 'ívhegeszt', 'védőgáz hegesztés', 'fémhegeszt', 'hegesztőtechnika'],
      electrical: ['elektrik', 'áram', 'feszültség', 'vezeték', 'kapcsoló', 'villany'],
      mechanical: ['gép', 'szerkezet', 'mechanik', 'alkatrész', 'hajtás', 'fogaskerék'],
      construction: ['építés', 'beton', 'tégla', 'szerkezet', 'alapozás', 'falazás'],
      automotive: ['autó', 'jármű', 'karosszéria', 'fék', 'váltó'],
      healthcare: ['egészség', 'beteg', 'kezelés', 'diagnosztik', 'gyógyszer', 'ápolás'],
      agriculture: ['mezőgazd', 'növény', 'termeszt', 'vetés', 'aratás', 'talaj'],
      textiles: ['textil', 'szövet', 'varr', 'fonál', 'ruha', 'anyag']
    };

    // Find matching field
    for (const [field, keywords] of Object.entries(fieldPatterns)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return field;
      }
    }

    return 'general';
  }

  /**
   * Get field-specific examples for professional areas
   */
  private getFieldSpecificExamples(field: string): string[] {
    const fieldExamples: Record<string, string[]> = {
      robotics: ["robotika", "automatizálás", "programozás", "kinematika", "vezérlés"],
      welding: ["hegesztés", "fémfeldolgozás", "hegesztéstechnika", "varratképzés"],
      cooking: ["főzés", "gasztronómia", "szakácsképzés", "élelmiszer-készítés"],
      electrical: ["elektrotechnika", "villamosság", "elektronika", "áramkörök"],
      mechanical: ["gépészet", "mechanika", "gépépítés", "szerkezetek"],
      construction: ["építőipar", "építéstechnika", "építészet", "szerkezetépítés"],
      automotive: ["autóipar", "járműtechnika", "gépjárművek", "autószerelés"],
      healthcare: ["egészségügy", "orvostudomány", "ápolás", "egészségmegőrzés"],
      agriculture: ["mezőgazdaság", "növénytermesztés", "állattenyésztés", "agrártechnika"],
      textiles: ["textilipar", "varrás", "szövés", "ruházat"],
      general: ["technológia", "műszaki alapok", "szakmai ismeretek", "alkalmazások"]
    };

    return fieldExamples[field] || fieldExamples.general;
  }

  /**
   * Add relevant web search content to enhance module content
   */
  private async addWebSearchContent(content: string, title: string, detectedField: string): Promise<string> {
    try {
      console.log(`🌐 Adding web search content for field: ${detectedField}`);
      console.log(`📄 Original content length: ${content.length}`);
      console.log(`🔍 Content preview: ${content.substring(0, 150)}...`);

      // Generate search query based on content and field
      const searchQuery = await this.generateWebSearchQuery(title, content, detectedField);
      console.log(`🔍 Generated search query: ${searchQuery}`);

      // Perform web search using multiApiService
      console.log('🌐 Starting web search...');
      const searchResults = await multiApiService.searchInternet(searchQuery);
      console.log(`📊 Search results count: ${searchResults ? searchResults.length : 0}`);

      if (searchResults && searchResults.length > 0) {
        console.log('🔍 Sample search result:', searchResults[0]);

        // Extract relevant information from search results
        const relevantInfo = this.extractRelevantWebInfo(searchResults, detectedField);
        console.log(`📋 Extracted relevant info pieces: ${relevantInfo.length}`);
        console.log('📋 Relevant info sample:', relevantInfo[0]);

        if (relevantInfo && relevantInfo.length > 0) {
          // Integrate search results into content
          console.log('🔗 Starting content integration with bold linking...');
          const enhancedContent = this.integrateWebContent(content, relevantInfo);
          console.log(`📄 Enhanced content length: ${enhancedContent.length}`);
          console.log(`🔗 Enhanced content preview: ${enhancedContent.substring(0, 200)}...`);
          console.log(`✅ Web content integrated, added ${relevantInfo.length} relevant pieces`);
          return enhancedContent;
        }
      }

      console.log('📝 No relevant web content found, returning original content');
      return content;
    } catch (error) {
      console.error('Web search content integration failed:', error);
      return content; // Fallback to original content
    }
  }

  /**
   * Generate search query for web content enhancement
   */
  private async generateWebSearchQuery(title: string, content: string, field: string): Promise<string> {
    const fieldExamples = this.getFieldSpecificExamples(field);

    const prompt = `
Készíts egy precíz keresési kifejezést internetkereséshez a következő tananyag bővítéséhez:

Cím: ${title}
Tartalom: ${content.substring(0, 500)}
Szakmai terület: ${field}
Kapcsolódó témák: ${fieldExamples.join(', ')}

Adj vissza EGYETLEN keresési kifejezést, ami a leginkább releváns információkat hozza fel:`;

    try {
      const response = await generateChatResponse(prompt, 'chat');
      return response.message.trim().replace(/['"]/g, '');
    } catch (error) {
      console.error('Search query generation failed:', error);
      return `${title} ${field}`;
    }
  }

  /**
   * Extract relevant information from web search results
   */
  private extractRelevantWebInfo(searchResults: any[], field: string): Array<{ text: string, source: string }> {
    const relevantInfo: Array<{ text: string, source: string }> = [];

    try {
      // Process first 3 search results
      const resultsToProcess = searchResults.slice(0, 3);

      for (const result of resultsToProcess) {
        if (result.snippet && result.title && result.url) {
          const snippet = result.snippet.trim();
          const title = result.title.trim();

          // Filter for relevant, substantial content
          if (snippet.length > 50 && snippet.length < 500) {
            relevantInfo.push({
              text: `**${title}**: ${snippet}`,
              source: result.url
            });
          }
        }
      }

      return relevantInfo.slice(0, 3); // Limit to top 3 relevant pieces
    } catch (error) {
      console.error('Error extracting web info:', error);
      return [];
    }
  }

  /**
   * Integrate web content into module content (simplified version - only adds web section)
   */
  private integrateWebContent(originalContent: string, webInfo: Array<{ text: string, source: string }>): string {
    if (webInfo.length === 0) {
      console.log('❌ No web info provided, returning original content');
      return originalContent;
    }

    console.log(`📋 Adding web search results section with ${webInfo.length} pieces`);

    // Add web content as additional information section only
    const webSection = `

## További információk

${webInfo.map(info => `${info.text}\n*Forrás: ${info.source}*`).join('\n\n')}`;

    const finalContent = originalContent + webSection;
    console.log(`📄 Final content with web section length: ${finalContent.length}`);

    return finalContent;
  }

  /**
   * Extract keywords from web search information
   */
  private extractKeywordsFromWebInfo(webInfo: Array<{ text: string, source: string }>): string[] {
    const keywords = new Set<string>();

    // Add common technical terms that are likely to appear in bold
    const commonTechnicalTerms = [
      'robot', 'robotok', 'robotika', 'automatizálás', 'programozás', 'karbantartás',
      'biztonsági', 'biztonság', 'szoftver', 'gépészet', 'technológia', 'vezérlés',
      'kód', 'algoritmus', 'fejlesztés', 'tervezés', 'rendszer', 'folyamat'
    ];

    commonTechnicalTerms.forEach(term => keywords.add(term));

    webInfo.forEach(info => {
      console.log(`🔍 Processing web info: "${info.text.substring(0, 100)}..."`);

      // Extract words from titles and snippets
      const text = info.text.toLowerCase();
      const words = text.match(/\b[a-záéíóöőúüű]{4,}\b/g) || [];

      words.forEach(word => {
        // Add significant technical terms
        if (word.length >= 4 && !this.isCommonWord(word)) {
          keywords.add(word);
        }
      });
    });

    const finalKeywords = Array.from(keywords).slice(0, 15); // Increase limit
    console.log(`📋 Final extracted keywords: ${finalKeywords.join(', ')}`);

    return finalKeywords;
  }

  /**
   * Check if a word is too common to be linked
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'hogy', 'mint', 'vagy', 'ahol', 'amely', 'amikor', 'mivel', 'után', 'alatt',
      'által', 'során', 'között', 'ellen', 'mellett', 'nélkül', 'keresztül',
      'szerint', 'alapján', 'miatt', 'helyett', 'előtt', 'után', 'során',
      'lehet', 'kell', 'lesz', 'volt', 'van', 'nincs', 'igen', 'nem',
      'csak', 'még', 'már', 'most', 'akkor', 'itt', 'ott', 'ahol'
    ];

    return commonWords.includes(word.toLowerCase());
  }

  /**
   * Link bold keywords in content to relevant web sources
   */
  private linkBoldKeywordsToWebSources(content: string, keywords: string[], webInfo: Array<{ text: string, source: string }>): string {
    let linkedContent = content;

    // Find all bold text patterns **word** in the content
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = content.match(boldPattern);

    console.log(`🔍 Found ${boldMatches ? boldMatches.length : 0} bold patterns in content`);
    if (boldMatches) {
      console.log('🔍 Bold patterns found:', boldMatches.slice(0, 5));
    }

    let linkingCount = 0;

    linkedContent = linkedContent.replace(boldPattern, (match, boldText) => {
      const lowerBoldText = boldText.toLowerCase();
      console.log(`🔍 Processing bold text: "${boldText}"`);

      // Check if this bold text matches any of our search keywords
      // Use more flexible matching - check if bold text contains keyword or vice versa
      const matchingKeyword = keywords.find(keyword => {
        const keywordLower = keyword.toLowerCase();
        return lowerBoldText.includes(keywordLower) ||
          keywordLower.includes(lowerBoldText) ||
          lowerBoldText === keywordLower ||
          // Also check for partial matches for compound words
          (lowerBoldText.length > 4 && keywordLower.includes(lowerBoldText)) ||
          (keywordLower.length > 4 && lowerBoldText.includes(keywordLower));
      });

      if (matchingKeyword) {
        console.log(`✅ Found matching keyword "${matchingKeyword}" for bold text "${boldText}"`);

        // Find the most relevant web source for this keyword
        const relevantSource = webInfo.find(info =>
          info.text.toLowerCase().includes(matchingKeyword)
        );

        if (relevantSource) {
          console.log(`🔗 Linking "${boldText}" to source: ${relevantSource.source}`);
          linkingCount++;
          // Create a link with the bold text pointing to relevant source
          return `**[${boldText}](${relevantSource.source})**`;
        } else {
          console.log(`❌ No relevant source found for keyword "${matchingKeyword}"`);
        }
      } else {
        console.log(`❌ No matching keyword found for bold text "${boldText}"`);
        console.log(`Available keywords: ${keywords.join(', ')}`);
      }

      // If no match found, keep original bold formatting
      return match;
    });

    console.log(`🔗 Successfully linked ${linkingCount} bold keywords`);

    return linkedContent;
  }

  /**
   * Link bold keywords directly to relevant websites based on content analysis
   */
  private async linkBoldKeywordsDirectly(content: string, title: string, detectedField: string): Promise<string> {
    console.log('🔗 Starting direct bold keyword linking...');

    // Find all bold patterns in content
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = content.match(boldPattern);

    if (!boldMatches || boldMatches.length === 0) {
      console.log('❌ No bold patterns found in content');
      return content;
    }

    console.log(`🔍 Found ${boldMatches.length} bold patterns to process`);

    let linkedContent = content;
    const processedKeywords = new Set<string>();

    // Process each bold keyword individually
    for (const boldMatch of boldMatches) {
      const boldText = boldMatch.replace(/\*\*/g, '');

      if (processedKeywords.has(boldText.toLowerCase())) {
        continue; // Skip already processed keywords
      }

      processedKeywords.add(boldText.toLowerCase());

      try {
        console.log(`🔍 Processing bold keyword: "${boldText}"`);

        // Generate specific search query for this keyword based on context
        let searchQuery = `${boldText}`;

        // Get combined content for additional context checks
        const combinedContent = (title + ' ' + content).toLowerCase();

        // Add relevant context based on detected field and content analysis
        if (detectedField === 'robotics' || combinedContent.includes('robot')) {
          searchQuery += ' robotika automatizálás ipari robot';
        } else if (detectedField === 'safety' || combinedContent.includes('biztonság') || combinedContent.includes('felelősség') || combinedContent.includes('normák')) {
          searchQuery += ' munkavédelem biztonság szabvány';
        } else if (detectedField === 'logistics' || combinedContent.includes('szállítás')) {
          searchQuery += ' szállítás logisztika ipari';
        } else if (detectedField === 'industrial' || combinedContent.includes('ipari') || combinedContent.includes('gyártás')) {
          searchQuery += ' ipari technológia gyártás';
        } else if (detectedField === 'cooking' && combinedContent.includes('főz')) {
          searchQuery += ' főzés gasztronómia';
        } else {
          // For robotics/safety content, default to technical context
          searchQuery += ' ipari technológia';
        }

        searchQuery += ' magyarország';
        console.log(`🌐 Searching for: ${searchQuery}`);

        // Perform targeted web search
        const searchResults = await multiApiService.searchInternet(searchQuery);

        if (searchResults && searchResults.length > 0) {
          // Find the most relevant result
          const relevantResult = searchResults.find((result: any) =>
            result.title && result.url &&
            (result.title.toLowerCase().includes(boldText.toLowerCase()) ||
              result.snippet?.toLowerCase().includes(boldText.toLowerCase()))
          ) || searchResults[0];

          if (relevantResult && relevantResult.url) {
            console.log(`✅ Linking "${boldText}" to: ${relevantResult.url}`);

            // Replace all instances of this bold keyword with linked version
            const boldRegex = new RegExp(`\\*\\*${boldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`, 'gi');
            linkedContent = linkedContent.replace(boldRegex, `**[${boldText}](${relevantResult.url})**`);
          }
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Failed to link keyword "${boldText}":`, error);
      }
    }

    const linkCount = (linkedContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    console.log(`🔗 Successfully linked ${linkCount} bold keywords`);

    return linkedContent;
  }

  /**
   * Optimized bold keyword linking with configurable settings
   */
  private async linkBoldKeywordsSimplified(content: string, title: string): Promise<string> {
    const settings = await this.getOptimizationSettings();

    if (!settings.enableBoldLinking) {
      console.log('🔗 Bold keyword linking disabled in optimization settings');
      return content;
    }

    console.log(`🔗 Starting optimized bold keyword linking (max: ${settings.maxBoldKeywords})...`);

    // Find all bold patterns in content
    const boldPattern = /\*\*([^*]+)\*\*/g;
    const boldMatches = content.match(boldPattern);

    if (!boldMatches || boldMatches.length === 0) {
      console.log('❌ No bold patterns found in content');
      return content;
    }

    console.log(`🔍 Found ${boldMatches.length} bold patterns to process`);

    let linkedContent = content;
    const processedKeywords = new Set<string>();

    // Use configurable limit for bold keywords
    const limitedMatches = boldMatches.slice(0, settings.maxBoldKeywords);

    for (const boldMatch of limitedMatches) {
      const boldText = boldMatch.replace(/\*\*/g, '');

      if (processedKeywords.has(boldText.toLowerCase()) || boldText.length < 3) {
        continue; // Skip already processed or too short keywords
      }

      processedKeywords.add(boldText.toLowerCase());

      try {
        console.log(`🔍 Processing bold keyword: "${boldText}"`);

        // Generate context-aware search query based on title content
        let searchQuery = `${boldText}`;

        // Add context based on title and content analysis
        const titleLower = title.toLowerCase();
        if (titleLower.includes('robot') || titleLower.includes('automatiz')) {
          searchQuery += ' robotika ipari automatizálás';
        } else if (titleLower.includes('biztonság') || titleLower.includes('felelősség')) {
          searchQuery += ' munkavédelem biztonság';
        } else if (titleLower.includes('szállítás') || titleLower.includes('kezelés')) {
          searchQuery += ' logisztika szállítás';
        } else {
          searchQuery += ' ipari technológia';
        }

        searchQuery += ' magyarország';
        console.log(`🌐 Searching for: ${searchQuery}`);

        // Create Wikipedia link directly (restored working method)
        const encodedKeyword = encodeURIComponent(boldText.replace(/\s+/g, '_'));
        const wikipediaUrl = `https://hu.wikipedia.org/wiki/${encodedKeyword}`;

        console.log(`✅ Linking "${boldText}" to Wikipedia: ${wikipediaUrl}`);

        // Replace all instances of this bold keyword with Wikipedia link
        const boldRegex = new RegExp(`\\*\\*${boldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\*\\*`, 'gi');
        linkedContent = linkedContent.replace(boldRegex, `**[${boldText}](${wikipediaUrl})**`);

        // Use configurable delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, settings.boldKeywordDelay));

      } catch (error) {
        console.error(`❌ Failed to link keyword "${boldText}":`, error);
      }
    }

    const linkCount = (linkedContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
    console.log(`🔗 Successfully linked ${linkCount} bold keywords out of ${limitedMatches.length} processed`);

    return linkedContent;
  }

  /**
   * Generate YouTube search terms using dedicated prompt
   */
  private async generateYouTubeSearchTerms(title: string, content: string, prompt: string, subjectName?: string, professionName?: string): Promise<string[]> {
    try {
      console.log('🔥 SEQUENTIAL AI STEP 3A: Generating YouTube search terms with admin prompt');

      // Detect professional field and get appropriate examples
      const field = this.detectProfessionalField(title, content, subjectName, professionName);
      const examples = this.getFieldSpecificExamples(field);

      console.log(`🎯 Detected field: ${field}, using examples:`, examples);

      // Use admin-configured prompt for YouTube search terms
      const structuredPrompt = `${prompt
        .replace('{title}', title)
        .replace('{content}', content.substring(0, 800))}

Szakma: ${professionName || 'Általános'}
Tantárgy: ${subjectName || 'Általános'}

Jó példák ehhez a területhez: ${JSON.stringify(examples)}
Kerülendő: ["konkrét elem nevek", "részletes műszaki paraméterek", "márkanevek"]

Válasz csak JSON array formátumban:`;

      console.log('📝 YouTube search terms generation started');
      const response = await generateChatResponse(structuredPrompt, 'chat');

      // Extract search terms from response
      const cleanResponse = response.message.trim();
      console.log('🔍 YouTube AI response:', cleanResponse.substring(0, 200) + '...');

      // Try to extract JSON array
      const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);

      if (jsonMatch) {
        try {
          const searchTerms = JSON.parse(jsonMatch[0]);
          if (Array.isArray(searchTerms)) {
            const filteredTerms = searchTerms
              .slice(0, 3)
              .filter(term => typeof term === 'string' && term.length > 3 && term.length < 50)
              .map(term => term.trim());
            console.log('✅ YouTube search terms extracted from JSON:', filteredTerms);
            return filteredTerms;
          }
        } catch (parseError) {
          console.log('JSON parse failed for YouTube terms');
        }
      }

      // Fallback: Use AI to analyze content and generate appropriate search terms
      try {
        const field = this.detectProfessionalField(title, content, subjectName, professionName);
        const examples = this.getFieldSpecificExamples(field);
        const contextExamples = `Ha ${field} területről szól -> ${JSON.stringify(examples)}`;

        const analysisPrompt = `Elemezd a következő tartalmat és határozd meg a PONTOS szakmai területet YouTube kereséshez:

Cím: ${title}
Tartalom: ${content.substring(0, 800)}
Szakma: ${professionName || 'Általános'}
Tantárgy: ${subjectName || 'Általános'}

FONTOS: A keresési kifejezések tükrözzék a TÉNYLEGES tartalmat, ne általános kategóriákat!

${contextExamples}

JSON válasz (2-3 kifejezés):`;

        console.log('🤖 AI-powered YouTube category analysis started');
        const analysisResponse = await generateChatResponse(analysisPrompt, 'chat');

        // Try to extract JSON from AI response
        const jsonMatch = analysisResponse.message.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          try {
            const aiCategories = JSON.parse(jsonMatch[0]);
            if (Array.isArray(aiCategories) && aiCategories.length > 0) {
              const cleanCategories = aiCategories
                .filter(term => typeof term === 'string' && term.length > 3)
                .slice(0, 3);
              console.log('✅ AI-generated YouTube categories:', cleanCategories);
              return cleanCategories;
            }
          } catch (parseError) {
            console.log('AI category analysis parse failed, using content-based fallback');
          }
        }
      } catch (aiError) {
        console.log('AI category analysis failed, using content-based fallback');
      }

      // Smart content-based fallback
      const lowerTitle = title.toLowerCase();
      const lowerContent = content.toLowerCase();

      if (lowerTitle.includes('robot') || lowerContent.includes('robot') || lowerContent.includes('elfin')) {
        console.log('🤖 Detected robotics content');
        return ['robotika', 'robot programozás', 'automatizálás'];
      }

      if (lowerTitle.includes('hegesztés') || lowerContent.includes('hegesztés') || lowerContent.includes('mig') || lowerContent.includes('mag')) {
        console.log('🔥 Detected welding content');
        return ['hegesztés', 'fémfeldolgozás', 'hegesztéstechnika'];
      }

      if (lowerTitle.includes('főzés') || lowerContent.includes('lecsó') || lowerContent.includes('főzés')) {
        console.log('👨‍🍳 Detected cooking content');
        return ['főzés', 'szakácsképzés', 'gasztronómia'];
      }

      if (lowerTitle.includes('acél') || lowerContent.includes('acél') || lowerContent.includes('metallurg')) {
        console.log('⚙️ Detected materials science content');
        return ['metallurgia', 'anyagtudomány', 'acél'];
      }

      console.log('📝 Using title-based fallback for YouTube search');
      return [title.toLowerCase().split(' ')[0]];
    } catch (error) {
      console.error('YouTube search terms generation failed:', error);
      return [title.toLowerCase().split(' ')[0]]; // Single word fallback
    }
  }

  /**
   * Generate Wikipedia keywords with consistent field detection
   */
  private async generateWikipediaKeywordsConsistent(title: string, content: string, prompt: string, detectedField: string, fieldExamples: string[], subjectName?: string, professionName?: string): Promise<string[]> {
    try {
      console.log('🔥 SEQUENTIAL AI STEP 2A: Generating Wikipedia keywords with pre-detected field');
      console.log(`🎯 Using fixed field: ${detectedField} with examples:`, fieldExamples);

      const structuredPrompt = `
Elemezd ezt a tartalmat és adj vissza 15-25 magyar kulcsszót JSON array formátumban, amelyekhez Wikipedia linkeket kell készíteni.

Cím: ${title}
Tartalom: ${content.substring(0, 800)}
Szakma: ${professionName || 'Általános'}
Tantárgy: ${subjectName || 'Általános'}
Terület: ${detectedField}

KÖVETELMÉNYEK:
- 15-25 releváns kulcsszó
- Szakmai kifejezések és fogalmak
- Gyakorlati és elméleti fogalmak egyaránt
- Magyar Wikipedia-ban elérhető fogalmak
- Például ehhez a területhez: ${JSON.stringify(fieldExamples)}

Válasz csak JSON array formátumban:`;

      console.log('📝 Wikipedia prompt being used for keywords');
      const response = await generateChatResponse(structuredPrompt, 'chat');

      // Extract keywords from response
      const cleanResponse = response.message.trim();
      console.log('🔍 Wikipedia AI response:', cleanResponse.substring(0, 200) + '...');

      // Try to extract JSON array
      const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);

      if (jsonMatch) {
        try {
          const keywords = JSON.parse(jsonMatch[0]);
          let filteredKeywords: string[] = [];

          if (Array.isArray(keywords)) {
            // Handle array of objects format: [{kulcsszó: "...", wikipedia: "..."}, ...]
            filteredKeywords = keywords
              .slice(0, 30)
              .map(item => {
                if (typeof item === 'object' && item !== null) {
                  return item.kulcsszó || item.kulcsszo || item.keyword || item.term || '';
                }
                return typeof item === 'string' ? item : '';
              })
              .filter(term => typeof term === 'string' && term.length > 2 && term.length < 50)
              .map(term => term.trim().toLowerCase());
          }

          console.log('✅ Wikipedia keywords extracted from JSON:', filteredKeywords);
          return filteredKeywords;
        } catch (parseError) {
          console.log('JSON parse failed for Wikipedia keywords, trying manual extraction');
        }
      }

      // Fallback: return field-specific keywords
      console.log('📝 Using field-specific fallback keywords');
      return fieldExamples.slice(0, 5);
    } catch (error) {
      console.error('Wikipedia keywords generation failed:', error);
      return fieldExamples.slice(0, 3); // Safe fallback
    }
  }

  /**
   * Generate Wikipedia keywords using dedicated prompt (legacy method)
   */
  private async generateWikipediaKeywords(title: string, content: string, prompt: string, subjectName?: string, professionName?: string): Promise<string[]> {
    try {
      console.log('🔥 SEQUENTIAL AI STEP 2A: Generating Wikipedia keywords with admin prompt');

      // Detect professional field and get appropriate examples
      const field = this.detectProfessionalField(title, content, subjectName, professionName);
      const examples = this.getFieldSpecificExamples(field);

      console.log(`🎯 Detected field for Wikipedia: ${field}, using examples:`, examples);

      const structuredPrompt = `
Elemezd ezt a tartalmat és adj vissza 15-25 magyar kulcsszót JSON array formátumban, amelyekhez Wikipedia linkeket kell készíteni.

Cím: ${title}
Tartalom: ${content.substring(0, 800)}
Szakma: ${professionName || 'Általános'}
Tantárgy: ${subjectName || 'Általános'}

KÖVETELMÉNYEK:
- 15-25 releváns kulcsszó
- Szakmai kifejezések és fogalmak
- Gyakorlati és elméleti fogalmak egyaránt
- Magyar Wikipedia-ban elérhető fogalmak
- Például ehhez a területhez: ${JSON.stringify(examples)}

Válasz csak JSON array formátumban:`;

      console.log('📝 Wikipedia prompt being used for keywords');
      const response = await generateChatResponse(structuredPrompt, 'chat');

      // Extract keywords from response
      const cleanResponse = response.message.trim();
      console.log('🔍 Wikipedia AI response:', cleanResponse.substring(0, 200) + '...');

      // Try to extract JSON array
      const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);

      if (jsonMatch) {
        try {
          const keywords = JSON.parse(jsonMatch[0]);
          let filteredKeywords: string[] = [];

          if (Array.isArray(keywords)) {
            // Handle array of objects format: [{kulcsszó: "...", wikipedia: "..."}, ...]
            filteredKeywords = keywords
              .slice(0, 30)
              .map(item => {
                if (typeof item === 'object' && item !== null) {
                  return item.kulcsszó || item.kulcsszo || item.keyword || item.term || '';
                }
                return typeof item === 'string' ? item : '';
              })
              .filter(term => typeof term === 'string' && term.length > 2 && term.length < 50)
              .map(term => term.trim().toLowerCase());
          }

          console.log('✅ Wikipedia keywords extracted from JSON:', filteredKeywords);
          return filteredKeywords;
        } catch (parseError) {
          console.log('JSON parse failed for Wikipedia keywords, trying manual extraction');
        }
      }

      // Use AI to intelligently extract Wikipedia-relevant keywords from content with context awareness
      try {
        const field = this.detectProfessionalField(title, content, subjectName, professionName);
        const examples = this.getFieldSpecificExamples(field);
        const contextualPrompt = `${field.toUpperCase()} TARTALOM: ${examples.join(', ')} témakörben keress fogalmakat.`;

        const keywordPrompt = `${contextualPrompt}

Elemezd a következő tananyag tartalmát és találd meg a legfontosabb szakmai fogalmakat Wikipedia linkekhez:

Cím: ${title}
Tartalom: ${content.substring(0, 600)}

FONTOS: A kulcsszavak tükrözzék a TÉNYLEGES tartalmat!

JSON válasz:`;

        console.log('🔍 AI-powered Wikipedia keyword extraction started');
        const keywordResponse = await generateChatResponse(keywordPrompt, 'chat');

        // Try to extract JSON from AI response
        const jsonMatch = keywordResponse.message.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          try {
            const aiKeywords = JSON.parse(jsonMatch[0]);
            if (Array.isArray(aiKeywords) && aiKeywords.length > 0) {
              const cleanKeywords = aiKeywords
                .filter(term => typeof term === 'string' && term.length > 2 && term.length < 30)
                .map(term => term.trim().toLowerCase());
              console.log('✅ AI-extracted Wikipedia keywords:', cleanKeywords);
              return cleanKeywords;
            }
          } catch (parseError) {
            console.log('AI keyword extraction parse failed, using fallback');
          }
        }
      } catch (aiError) {
        console.log('AI keyword extraction failed, using fallback');
      }

      // Fallback: extract basic terms from content
      const fallbackKeywords = new Set<string>();

      // Extract bold terms
      const boldTerms = content.match(/\*\*([^*]+)\*\*/g);
      if (boldTerms) {
        boldTerms.forEach(term => {
          const cleaned = term.replace(/\*\*/g, '').trim().toLowerCase();
          if (cleaned.length > 2 && cleaned.length < 20) {
            fallbackKeywords.add(cleaned);
          }
        });
      }

      // Extract from title
      const titleWords = title.toLowerCase().split(' ').filter(word => word.length > 3);
      titleWords.forEach(word => fallbackKeywords.add(word));

      const finalKeywords = Array.from(fallbackKeywords);
      console.log('⚡ Fallback Wikipedia keywords extracted:', finalKeywords);
      return finalKeywords.length > 0 ? finalKeywords : [title.toLowerCase().split(' ')[0]];
    } catch (error) {
      console.error('Wikipedia keywords generation failed:', error);
      return [];
    }
  }

  /**
   * Generate internet-enhanced content using dedicated prompt
   */
  private async generateInternetEnhancedContent(
    title: string,
    content: string,
    type: 'concise' | 'detailed',
    prompt: string,
    subjectName?: string,
    professionName?: string
  ): Promise<string> {
    try {
      const contextInfo = `
Szakma: ${professionName || 'Általános'}
Tantárgy: ${subjectName || 'Általános'}`;

      const enhancedPrompt = `${prompt
        .replace('{title}', title)
        .replace('{content}', `Kezdeti vázlat/bemenet:\n${content}`)}
        
${contextInfo}
        
A fenti bemenetet CSAK kiindulópontnak használd, a kimenet legyen egy teljes értékű, kifejtett, ${type === 'concise' ? 'tömör, de lényegre törő' : 'részletes és alapos'} oktatási anyag! Ne másold le, hanem FEJLESZD TOVÁBB magyarázatokkal és példákkal!

KÖTELEZŐ ELEM: A válaszba illessz be egy Mermaid diagramot (pl. mermaid graph TD blokk), ami összefoglalja a tananyag struktúráját vagy folyamatát! Enélkül a válasz elfogadhatatlan.`;

      const response = await generateChatResponse(enhancedPrompt, 'basic_ai_only');
      return response.message;
    } catch (error) {
      console.error(`Internet-enhanced content generation failed for ${type}:`, error);
      return content; // Return original content as fallback
    }
  }

  /**
   * Rate-limited YouTube search with caching
   */
  private async searchYouTubeWithCache(searchQuery: string): Promise<any[]> {
    const cacheKey = searchQuery.toLowerCase().replace(/\s+/g, '_');

    // Check cache first
    if (this.youtubeCache.has(cacheKey)) {
      console.log(`📦 Using cached YouTube results for: ${searchQuery}`);
      return this.youtubeCache.get(cacheKey) || [];
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastYouTubeCall;
    if (timeSinceLastCall < this.YOUTUBE_RATE_LIMIT) {
      const waitTime = this.YOUTUBE_RATE_LIMIT - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before YouTube API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      console.log(`🎥 YouTube API call: "${searchQuery}"`);
      this.lastYouTubeCall = Date.now();

      const videoResults = await multiApiService.searchYoutube(searchQuery);

      if (Array.isArray(videoResults) && videoResults.length > 0) {
        const processedVideos = videoResults
          .filter(video => video.id?.videoId || video.videoId)
          .slice(0, 2)
          .map((video: any) => ({
            title: (video.snippet?.title || 'Videó').substring(0, 80),
            videoId: video.id?.videoId || video.videoId,
            description: (video.snippet?.description || 'Tartalom').substring(0, 120),
            url: `https://www.youtube.com/watch?v=${video.id?.videoId || video.videoId}`
          }));

        this.youtubeCache.set(cacheKey, processedVideos);
        console.log(`✅ Found and cached ${processedVideos.length} videos for: ${searchQuery}`);
        return processedVideos;
      } else {
        this.youtubeCache.set(cacheKey, []);
        return [];
      }
    } catch (error) {
      console.log(`❌ YouTube search failed for: ${searchQuery}`, error);
      this.youtubeCache.set(cacheKey, []);
      return [];
    }
  }

  /**
   * Enrich with YouTube videos based on search terms (sequential AI step 3)
   */
  private async enrichWithYouTubeVideos(searchTerms: string[]): Promise<Array<{
    concept: string;
    definition: string;
    youtubeVideos: Array<{
      title: string;
      videoId: string;
      description: string;
      url: string;
    }>;
  }>> {
    const enrichedConcepts = [];

    console.log(`🔥 SEQUENTIAL AI STEP 3B: Starting optimized YouTube search for ${searchTerms.length} terms`);

    // Process only 2 most important terms to reduce API calls
    for (const searchTerm of searchTerms.slice(0, 2)) {
      try {
        console.log(`🎥 YouTube API call for: "${searchTerm}"`);

        // Use optimized cached search
        // Use optimized cached search with fallback
        let educationalQuery = `${searchTerm} oktatás`;
        let youtubeVideos = await this.searchYouTubeWithCache(educationalQuery);

        // If no videos found with "oktatás" suffix, try broader search
        if (!youtubeVideos || youtubeVideos.length === 0) {
          console.log(`⚠️ No videos found for "${educationalQuery}", trying broader search: "${searchTerm}"`);
          youtubeVideos = await this.searchYouTubeWithCache(searchTerm);
        }

        // Generate AI definition for the concept
        const definitionPrompt = `Adj egy rövid szakmai definíciót erre a fogalomra: "${searchTerm}". Csak 1-2 mondat, magyar nyelven.`;
        let definition = `Szakmai fogalom: ${searchTerm}`;

        try {
          const { generateChatResponse } = await import('./openai');
          const defResponse = await generateChatResponse(definitionPrompt, 'chat');
          definition = defResponse.message.trim();
        } catch (defError) {
          console.log(`Definition generation failed for: "${searchTerm}"`);
        }

        enrichedConcepts.push({
          concept: searchTerm,
          definition,
          youtubeVideos
        });

      } catch (error) {
        console.error(`❌ Error processing YouTube search for "${searchTerm}":`, error);
        enrichedConcepts.push({
          concept: searchTerm,
          definition: `Szakmai fogalom: ${searchTerm}`,
          youtubeVideos: []
        });
      }
    }

    const totalVideos = enrichedConcepts.reduce((sum, concept) => sum + concept.youtubeVideos.length, 0);
    console.log(`✅ SEQUENTIAL AI STEP 3B COMPLETED - Generated ${enrichedConcepts.length} concepts with ${totalVideos} total videos`);
    return enrichedConcepts;
  }

  /**
   * Extract Wikipedia links from content for a specific concept
   */
  private extractWikipediaLinksFromContent(concept: string): Array<{ text: string, url: string, description?: string }> {
    const conceptLower = concept.toLowerCase();

    // Generate common Wikipedia URL variations for this concept
    const wikipediaLinks = [];

    // Basic Wikipedia link
    const encodedConcept = encodeURIComponent(concept.replace(/\s+/g, '_'));
    wikipediaLinks.push({
      text: concept,
      url: `https://hu.wikipedia.org/wiki/${encodedConcept}`,
      description: `Wikipedia cikk: ${concept}`
    });

    return wikipediaLinks;
  }

  /**
   * Add Wikipedia links to content based on keywords
   */
  private addWikipediaLinksToContent(content: string, keywords: string[]): string {
    let linkedContent = content;

    keywords.forEach(keyword => {
      // Escape special regex characters in keyword
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b(?![\\]\\)])`, 'gi');
      const wikiUrl = `https://hu.wikipedia.org/wiki/${encodeURIComponent(keyword)}`;
      linkedContent = linkedContent.replace(regex, `[${keyword}](${wikiUrl})`);
    });

    return linkedContent;
  }

  /**
   * Add Wikipedia links to key technical terms (legacy method)
   */
  private addWikipediaLinks(content: string): string {
    // Common technical terms that should have Wikipedia links
    const technicalTerms = [
      'robot', 'robotika', 'automatizálás', 'hegesztés', 'welding',
      'főzés', 'gasztronómia', 'kulináris', 'lecsó', 'paprika',
      'paradicsom', 'kolbász', 'tojás', 'programozás', 'kód',
      'algoritmus', 'szoftver', 'hardware', 'technológia'
    ];

    let linkedContent = content;

    technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b(?![\\]\\)])`, 'gi');
      linkedContent = linkedContent.replace(regex, (match) => {
        const wikiTerm = match.toLowerCase().replace(/á/g, 'a').replace(/é/g, 'e')
          .replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ö/g, 'o')
          .replace(/ő/g, 'o').replace(/ú/g, 'u').replace(/ü/g, 'u')
          .replace(/ű/g, 'u');
        return `[${match}](https://hu.wikipedia.org/wiki/${encodeURIComponent(wikiTerm)})`;
      });
    });

    return linkedContent;
  }

  /**
   * Extract YouTube search terms using AI based on module content and admin system message
   */
  private async extractYouTubeSearchTerms(
    concept: string,
    definition: string,
    subjectContext?: string,
    customSystemMessage?: string
  ): Promise<string[]> {
    try {
      const prompt = `
Fogalom: "${concept}"
Definíció: "${definition}"
${subjectContext ? `Szakmai kontextus: ${subjectContext}` : ''}

Generálj 1 konkrét YouTube keresési kifejezést ehhez a fogalomhoz, amely a legjobban segít a tanulóknak megérteni ezt a témát.

Válasz csak JSON array formátumban, pontosan 1 kifejezéssel:
["legjobb keresési kifejezés"]`;

      const response = await generateChatResponse(prompt, 'basic_ai_only', undefined, customSystemMessage);

      // More robust JSON extraction
      let cleanResponse = response.message.trim();

      // Extract JSON array from response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        try {
          const searchTerms = JSON.parse(jsonMatch[0]);
          if (Array.isArray(searchTerms) && searchTerms.length > 0) {
            return searchTerms.slice(0, 1).filter(term => typeof term === 'string' && term.length > 2);
          }
        } catch (parseError) {
          console.log('JSON parse failed, trying line extraction');
        }
      }

      // Fallback: extract quoted strings
      const quotedTerms = cleanResponse.match(/"([^"]+)"/g);
      if (quotedTerms && quotedTerms.length > 0) {
        return quotedTerms
          .map(term => term.replace(/"/g, '').trim())
          .filter(term => term.length > 2)
          .slice(0, 1);
      }

    } catch (error) {
      console.error('AI search term extraction failed:', error);
    }

    // Context-aware fallback based on subject
    const contextLower = (subjectContext || '').toLowerCase();
    if (contextLower.includes('robot') || contextLower.includes('automatizál') || contextLower.includes('elfin')) {
      return [
        `Elfin robot programozás`,
        `kollaboratív robot tutorial`,
        `ipari robot betanítás`,
        `robot programozás magyar`,
        `cobot alkalmazás`
      ];
    } else if (contextLower.includes('főzés') || contextLower.includes('lecsó') || contextLower.includes('gasztronóm')) {
      return [
        `${concept} recept`,
        `${concept} cooking tutorial`,
        `${concept} magyar konyha`,
        `${concept} főzés technika`,
        `${concept} gasztronómia`
      ];
    } else if (contextLower.includes('hegesztés') || contextLower.includes('fém')) {
      return [
        `${concept} hegesztés`,
        `${concept} welding tutorial`,
        `${concept} fémipari`,
        `${concept} metallurgia`,
        `${concept} hegesztő oktatás`
      ];
    }

    // Generic fallback
    return [
      `${concept} tutorial`,
      `${concept} magyarázat`,
      `${concept} oktatás`,
      `${concept} gyakorlat`,
      `${concept} használat`
    ];
  }

  async createLinkedContent(
    content: string,
    keyConceptsWithVideos: Array<{
      concept: string;
      definition: string;
      youtubeVideos: Array<{
        title: string;
        videoId: string;
        description: string;
        url: string;
      }>;
    }>
  ): Promise<string> {
    let linkedContent = content;

    // Create links for each key concept
    keyConceptsWithVideos.forEach(({ concept, youtubeVideos }) => {
      if (youtubeVideos.length > 0) {
        const primaryVideo = youtubeVideos[0];
        const conceptRegex = new RegExp(`\\b${concept}\\b`, 'gi');
        let replaced = false;
        linkedContent = linkedContent.replace(conceptRegex, (match) => {
          if (!replaced) {
            replaced = true;
            return `[${match}](${primaryVideo.url} "${primaryVideo.title}")`;
          }
          return match;
        });
      }
    });

    return linkedContent;
  }

  async generateMultipleQuizSets(title: string, content: string): Promise<any[]> {
    try {
      console.log('📝 Generating 5 quiz sets of mixed question types (10 questions each)...');
      const apiKey = process.env.OPENAI_API_KEY || (await storage.getSystemSetting('openai_api_key'))?.value;
      if (!apiKey) { console.error('❌ No OpenAI API key'); return []; }

      const openai = new OpenAI({ apiKey });
      const snippet = content.substring(0, 3000);
      const allSets: any[] = [];

      for (let i = 0; i < 5; i++) {
        try {
          const resp = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Using gpt-4o-mini for better logic in complex questions
            messages: [
              { 
                role: 'system', 
                content: `Te egy szakértő oktató vagy. A feladatod, hogy változatos, szakmai tesztkérdéseket készíts egy tananyaghoz. 
                HASZNÁLJ KÜLÖNBÖZŐ KÉRDÉSTÍPUSOKAT vegyesen:
                1. 'single': Sima feleletválasztós (1 jó válasz).
                2. 'multiple': Több jó válasz is lehet (jelöld meg az összeset).
                3. 'ordering': Sorrendbe állítás (pl. folyamat lépései).
                4. 'icon': Válaszd ki a legmegfelelőbb ikont a fogalomhoz (Lucide-react ikon nevek: wrench, battery, zap, shield, alert-triangle, settings, cpu, hammer, activity, thermometer stb.).
                5. 'find_incorrect': Melyik állítás HAMIS? (3 igaz, 1 hamis).
                
                Válaszolj KIZÁRÓLAG érvényes JSON formátumban.` 
              },
              { 
                role: 'user', 
                content: `Generálj PONTOSAN 10 változatos tesztkérdést magyar nyelven.
                Modulcím: "${title}"
                Tananyag: ${snippet}
                
                A 10 kérdés legyen vegyes típusú (single, multiple, ordering, icon, find_incorrect).
                
                Válasz JSON formátuma:
                {"questions":[
                  {"type":"single", "question":"...", "options":["A","B","C","D"], "correctAnswer":0, "explanation":"..."},
                  {"type":"multiple", "question":"...", "options":["A","B","C","D"], "correctAnswers":[0, 2], "explanation":"..."},
                  {"type":"ordering", "question":"Állítsd sorrendbe...", "options":["Lépés 1","Lépés 2","Lépés 3"], "correctOrder":[1, 0, 2], "explanation":"..."},
                  {"type":"icon", "question":"Melyik ikon jelöli a hőt?", "options":["thermometer","zap","wrench","shield"], "correctAnswer":0, "explanation":"..."},
                  {"type":"find_incorrect", "question":"Melyik állítás HAMIS?", "options":["Igaz 1","Igaz 2","Hamis","Igaz 3"], "correctAnswer":2, "explanation":"..."}
                ]}` 
              }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 4000,
          });
          
          let text = (resp.choices[0]?.message?.content || '').replace(/```json\n?|```/g, '').trim();
          const parsed = JSON.parse(text);
          const qs = parsed.questions || (Array.isArray(parsed) ? parsed : null);
          
          if (qs && Array.isArray(qs) && qs.length >= 5) {
            allSets.push(qs);
            console.log(`  ✅ Set ${i + 1}/5: ${qs.length} mixed questions`);
          } else { console.warn(`  ⚠️ Set ${i + 1}/5: invalid structure`); }
        } catch (err: any) { console.error(`  ❌ Set ${i + 1}/5:`, err.message?.substring(0, 80)); }
        if (i < 4) await new Promise(r => setTimeout(r, 1000));
      }
      console.log(`${allSets.length > 0 ? '✅' : '⚠️'} Generated ${allSets.length}/5 quiz sets with diverse types.`);
      return allSets;
    } catch (error) { console.error("❌ Quiz generation failed:", error); return []; }
  }

  async convertMermaidToSVGImages(content: string): Promise<string> {
    // Mermaid conversion completely disabled - return content unchanged
    console.log('Mermaid diagram conversion is disabled');
    return content;
  }
}

export const enhancedModuleGenerator = new EnhancedModuleGenerator();