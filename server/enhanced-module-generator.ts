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
    internetContentPrompt: string;
    conciseContentPrompt: string;
  }> {
    const [youtubePromptSetting, internetContentPromptSetting, conciseContentPromptSetting] = await Promise.all([
      storage.getSystemSetting('ai_youtube_prompt'),
      storage.getSystemSetting('ai_internet_content_prompt'),
      storage.getSystemSetting('concise-content-prompt')
    ]);

    return {
      youtubePrompt: youtubePromptSetting?.value || 'Javasolj 2-3 konkrét, létező vagy erősen valószínű YouTube videó CÍMET ehhez a tananyaghoz JSON tömbben. A címek legyenek pontosak és szakmailag relevánsak (pl. "Műszaki rajz alapjai - Vetületek"). Ne használj túl általános kifejezéseket!\n\nCím: {title}\nTartalom: {content}',
      internetContentPrompt: internetContentPromptSetting?.value || 'Generálj frissített, részletes tartalmat az internet segítségével. KÖTELEZŐ VIZUÁLIS ELEMEK:\n1. Legalább egy Mermaid diagram (folyamatábra) a logikai lépésekhez: ```mermaid ... ```\n2. TECHNIKAI RAJZ: Keresd meg a téma legfontosabb FIZIKAI elemét (pl. hegesztőív, tolómérő, elektromos kötés, tetőszerkezet, alkatrész) és generálj róla közvetlen SVG kódot: ```svg <svg ...>...</svg> ```. A rajz legyen letisztult, minimalista technikai vázlat, ami segíti a megértést. Modulcím: {title}, Eredeti tartalom: {content}',
      conciseContentPrompt: conciseContentPromptSetting?.value || 'Készíts tömör tananyagot (max 300 szó). KÖVETELMÉNY: Illessz be egy Mermaid folyamatábrát ÉS egy technikai SVG rajzot a legfontosabb fizikai elemről (pl. szerszám, alkatrész vázlata) ```svg ... ``` formátumban!\n\nVálasz:'
    };
  }

  async generateEnhancedModule(
    title: string,
    basicContent: string,
    subjectContext?: string,
    customSystemMessage?: string,
    subjectName?: string,
    professionName?: string,
    moduleType?: 'theory' | 'practical'
  ): Promise<EnhancedModuleContent> {
    const timeout = 300000; // 5 minute timeout

    return Promise.race([
      this.performEnhancement(title, basicContent, subjectContext, customSystemMessage, subjectName, professionName, moduleType),
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
    professionName?: string,
    moduleType?: 'theory' | 'practical'
  ): Promise<EnhancedModuleContent> {
    // Load specialized prompts from database
    const prompts = await this.loadPrompts();

    // Adjust prompts based on module type
    if (moduleType === 'practical') {
      prompts.internetContentPrompt = `Készíts egy minden részletre kiterjedő, szakmai GYAKORLATI ÚTMUTATÓT! 
      A tartalomnak tartalmaznia KELL:
      1. A feladat pontos lépéseit (szekvenciálisan).
      2. Megvalósítási lehetőségeket és alternatívákat.
      3. Szükséges eszközök és anyagok listáját.
      4. Segédleteket, mérési adatokat vagy beállítási értékeket.
      5. A BIZTONSÁGOS munkavégzés ismérveit és a munkavédelmi előírásokat (gyakorlatiasan).
      
      KÖTELEZŐ: Ahol szakmailag indokolt (pl. egy eszköz felépítése, egy folyamat fázisai), illessz be vizuális ábrákat (Mermaid folyamatábra vagy SVG technikai rajz)!
      
      A cél, hogy a szövegből a tanuló TÖKÉLETESEN el tudja sajátítani a gyakorlati fogásokat.
      Modulcím: {title}, Alapinformáció: {content}`;

      prompts.conciseContentPrompt = `Készíts tömör gyakorlati összefoglalót (max 300 szó):
      - Főbb lépések
      - Kritikus biztonsági pontok
      - Szükséges főbb eszközök
      - Egy egyszerű Mermaid vagy SVG ábra a folyamat szemléltetésére.
      
      Cím: {title}
      Szakma: {profession}`;
    } else {
      // Theory module defaults
      prompts.internetContentPrompt = `Készíts egy minden részletre kiterjedő, szakmai ELMÉLETI tananyagot!
      A tartalom legyen RÉSZLETES, professzionális és lefedjen minden szakmai aspektust.
      A cél, hogy a szövegből a tanuló TÖKÉLETESEN megértse és elsajátítsa az elméleti hátteret.
      Használj Markdown formázást, táblázatokat és listákat, svg rajzokat a jobb érthetőségért.
      
      KÖTELEZŐ: A fontosabb fogalmakat és összefüggéseket magyarázd el vizuálisan is (Mermaid diagram és SVG rajz)! Ne csak a végén legyen egy ábra, hanem a szövegbe ágyazva, ahol a leginkább segíti a megértést.
      
      Modulcím: {title}, Alapinformáció: {content}`;
      
      prompts.conciseContentPrompt = `Készíts TÖMÖR, de lényegre törő elméleti összefoglalót (max 300 szó):
      - Kulcsfogalmak magyarázata
      - Alapvető szabályok vagy összefüggések
      - Egy szemléltető vizuális ábra (Mermaid/SVG).
      
      Cím: {title}
      Szakma: {profession}`;
    }

    // SEQUENTIAL PROCESSING - Each step builds on the previous result

    // Step 1: Generate internet-enhanced detailed content using original content
    console.log(`[ENHANCED-GEN] Step 1: Detailed content...`);
    const internetEnhancedDetailed = await this.generateInternetEnhancedContent(title, basicContent, 'detailed', prompts.internetContentPrompt, subjectName, professionName);
    console.log(`[ENHANCED-GEN] Step 1 OK (${internetEnhancedDetailed.length} chars)`);

    console.log(`[ENHANCED-GEN] Step 1B: Concise content...`);
    const strictConcisePrompt = prompts.conciseContentPrompt
      .replace('{title}', title)
      .replace('{content}', basicContent)
      .replace('{profession}', professionName || 'Általános')
      .replace('{subject}', subjectName || 'Általános');

    const conciseResponse = await generateChatResponse(strictConcisePrompt, 'chat');
    const internetEnhancedConcise = conciseResponse.message.trim();
    console.log(`[ENHANCED-GEN] Step 1B OK (${internetEnhancedConcise.length} chars)`);

    // Use the full concise content without truncation
    let finalConciseContent = internetEnhancedConcise;
    console.log('📝 Using full concise content without character limits');

    // Step 2: Add relevant web search results to the internet-enhanced content
    console.log('🔥 SEQUENTIAL AI STEP 2: Adding relevant web search results to enhanced content...');

    // Detect professional field once and use consistently
    const detectedField = this.detectProfessionalField(title, internetEnhancedDetailed, subjectName, professionName);
    console.log(`🎯 Detected field for web search: ${detectedField}`);

    // Web search and bold linking are disabled as they clutter professional content
    const boldLinkedConcise = finalConciseContent;
    const boldLinkedDetailed = internetEnhancedDetailed;

    console.log('✅ Web search and bold linking bypassed');

    console.log(`[ENHANCED-GEN] Step 3: Sequential Tasks (YouTube terms, SVG, Quizzes)...`);
    
    let youtubeSearchTerms: any[] = [];
    try {
      youtubeSearchTerms = await this.generateYouTubeSearchTerms(title, boldLinkedDetailed, prompts.youtubePrompt, subjectName, professionName);
    } catch (e) {
      console.error("[ENHANCED-GEN] YouTube search terms failed, skipping...", e);
    }

    let conciseWithSVG = boldLinkedConcise;
    try {
      conciseWithSVG = await this.convertMermaidToSVGImages(boldLinkedConcise);
    } catch (e) {
      console.error("[ENHANCED-GEN] Mermaid conversion for concise failed, skipping...", e);
    }

    let detailedWithSVG = boldLinkedDetailed;
    try {
      detailedWithSVG = await this.convertMermaidToSVGImages(boldLinkedDetailed);
    } catch (e) {
      console.error("[ENHANCED-GEN] Mermaid conversion for detailed failed, skipping...", e);
    }

    let quizSets: any[] = [];
    if (moduleType !== 'practical') {
      try {
        quizSets = await this.generateMultipleQuizSets(title, boldLinkedDetailed);
      } catch (e) {
        console.error("[ENHANCED-GEN] Quiz generation failed, skipping...", e);
      }
    } else {
      console.log("[ENHANCED-GEN] Skipping quizzes for practical module");
    }
    console.log(`[ENHANCED-GEN] Step 3 OK (YT terms: ${youtubeSearchTerms.length}, Quizzes: ${quizSets.length})`);

    // Step 4: Find YouTube videos (sequential due to API limits)
    console.log('🔥 STEP 4: Finding YouTube videos...');
    let keyConceptsWithVideos: any[] = [];
    try {
      keyConceptsWithVideos = await this.enrichWithYouTubeVideos(youtubeSearchTerms);
    } catch (e) {
      console.error("[ENHANCED-GEN] YouTube enrichment failed, skipping...", e);
    }
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
- Az elméleti vázhoz kapcsolódó definíciókat, eszközöket, módszereket, eljárásokat
- A tananyag megértése szempontjából fontos fogalmakat, összefüggéseket és eljárásokat


Válaszolj JSON formátumban:
{
  "keyConcepts": ["fogalom1", "alapanyag1", "technika1", "fogalom2"]
}

Maximum 20 kulcsfogalom, beleértve az alapanyagokat és technikai elemeket.
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

        // Wikipedia links are disabled for concepts as requested
        const wikipediaLinks: any[] = [];

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

KÖTELEZŐ ELEM: A válaszba illessz be vizuális ábrákat (pl. mermaid folyamatábra vagy SVG technikai rajz), amelyek összefoglalják a tananyag struktúráját, egy eszközt vagy egy folyamatot! A vizuális szemléltetés segítse a megértést. Enélkül a válasz elfogadhatatlan.`;

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
      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 2) continue;
      
      // Safety check: if searchTerm is suspiciously long (e.g., a whole article), truncate it
      const safeSearchTerm = searchTerm.length > 60 ? searchTerm.substring(0, 60).split('.')[0] : searchTerm;

      try {
        console.log(`🎥 YouTube API call for: "${safeSearchTerm}"`);

        // Use optimized cached search with fallback
        let educationalQuery = `${safeSearchTerm} oktatás`;
        let youtubeVideos = await this.searchYouTubeWithCache(educationalQuery);

        // If no videos found with "oktatás" suffix, try broader search
        if (!youtubeVideos || youtubeVideos.length === 0) {
          console.log(`⚠️ No videos found for "${educationalQuery}", trying broader search: "${safeSearchTerm}"`);
          youtubeVideos = await this.searchYouTubeWithCache(safeSearchTerm);
        }

        // Generate AI definition for the concept - STRICT LENGTH LIMIT
        const definitionPrompt = `Adj egy NAGYON RÖVID szakmai definíciót (MAXIMUM 20 SZÓ) erre a fogalomra: "${safeSearchTerm}". Magyar nyelven válaszolj.`;
        let definition = `Szakmai fogalom: ${safeSearchTerm}`;

        try {
          const { generateChatResponse } = await import('./openai');
          const defResponse = await generateChatResponse(definitionPrompt, 'chat');
          const cleanDef = defResponse.message.trim();
          
          // Safety check for definition length
          if (cleanDef.length > 0 && cleanDef.length < 300) {
            definition = cleanDef;
          } else if (cleanDef.length >= 300) {
            console.log(`⚠️ Definition too long (${cleanDef.length} chars), using fallback`);
            definition = `A(z) ${safeSearchTerm} egy fontos szakmai fogalom a tananyagban.`;
          }
        } catch (defError) {
          console.log(`Definition generation failed for: "${safeSearchTerm}"`);
        }

        enrichedConcepts.push({
          concept: safeSearchTerm,
          definition,
          youtubeVideos
        });

      } catch (error) {
        console.error(`❌ Error processing YouTube search for "${safeSearchTerm}":`, error);
        enrichedConcepts.push({
          concept: safeSearchTerm,
          definition: `Szakmai fogalom: ${safeSearchTerm}`,
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
    return [];
  }

  /**
   * Add Wikipedia links to content based on keywords (Disabled as requested)
   */
  private addWikipediaLinksToContent(content: string, keywords: string[]): string {
    return content;
  }

  /**
   * Add Wikipedia links to key technical terms (legacy method)
   */
  private addWikipediaLinks(content: string): string {
    return content;
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
      console.log('📝 Generating 30 quiz questions (no image/icon questions)...');
      const apiKey = process.env.OPENAI_API_KEY || (await storage.getSystemSetting('openai_api_key'))?.value;
      if (!apiKey) { console.error('❌ No OpenAI API key'); return []; }

      const openai = new OpenAI({ apiKey });
      const snippet = content.substring(0, 4000);

      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Te egy szakértő oktató vagy. A feladatod, hogy változatos, szakmai tesztkérdéseket készíts egy tananyaghoz.
            HASZNÁLJ KÜLÖNBÖZŐ KÉRDÉSTÍPUSOKAT vegyesen:
            1. 'single': Sima feleletválasztós (1 jó válasz).
            2. 'multiple': Több jó válasz is lehet (jelöld meg az összeset).
            3. 'ordering': Sorrendbe állítás (pl. folyamat lépései).
            4. 'find_incorrect': Melyik állítás HAMIS? (3 igaz, 1 hamis).
            
            KÉPEKET, KÉPES VAGY IKON KÉRDÉSEKET (pl. 'icon' típus) TILOS LÉTREHOZNI!
            
            Válaszolj KIZÁRÓLAG érvényes JSON formátumban.` 
          },
          { 
            role: 'user', 
            content: `Generálj PONTOSAN 30 változatos tesztkérdést magyar nyelven.
            Modulcím: "${title}"
            Tananyag: ${snippet}
            
            A 30 kérdés legyen vegyes típusú (single, multiple, ordering, find_incorrect).
            KÉPES/IKON KÉRDÉSEKET NE GENERÁLJ!
            
            Válasz JSON formátuma:
            {"questions":[
              {"type":"single", "question":"...", "options":["A","B","C","D"], "correctAnswer":0, "explanation":"..."},
              {"type":"multiple", "question":"...", "options":["A","B","C","D"], "correctAnswers":[0, 2], "explanation":"..."},
              {"type":"ordering", "question":"Állítsd sorrendbe...", "options":["Lépés 1","Lépés 2","Lépés 3"], "correctOrder":[1, 0, 2], "explanation":"..."},
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
      const questions = parsed.questions || (Array.isArray(parsed) ? parsed : null);
      
      if (questions && Array.isArray(questions) && questions.length >= 10) {
        console.log(`  ✅ Generated ${questions.length} quiz questions successfully.`);
        return questions; // Return as a flat array of questions (new schema)
      } else {
        console.warn(`  ⚠️ Invalid quiz structure or too few questions generated.`);
        return [];
      }
    } catch (error) { 
      console.error("❌ Quiz generation failed:", error); 
      return []; 
    }
  }

  async convertMermaidToSVGImages(content: string): Promise<string> {
    if (!content) return content;
    
    // Find all mermaid code blocks: ```mermaid ... ```
    const mermaidRegex = /```mermaid\n([\s\S]*?)\n```/g;
    let newContent = content;
    let match;
    
    console.log(`[SVG-GEN] Checking for Mermaid diagrams to convert...`);
    
    // Create a list of matches first to avoid issues with string replacement during iteration
    const matches = [];
    while ((match = mermaidRegex.exec(content)) !== null) {
      matches.push({
        fullMatch: match[0],
        code: match[1].trim()
      });
    }
    
    if (matches.length === 0) {
      console.log(`[SVG-GEN] No Mermaid diagrams found in content.`);
      return content;
    }
    
    console.log(`[SVG-GEN] Found ${matches.length} diagrams. Converting...`);
    
    for (const item of matches) {
      try {
        // Base64 encode the mermaid code for mermaid.ink
        // We use a JSON object format which is more robust for complex diagrams
        const diagramConfig = {
          code: item.code,
          mermaid: { theme: "default" }
        };
        const jsonStr = JSON.stringify(diagramConfig);
        const base64 = Buffer.from(jsonStr).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
        const imageUrl = `https://mermaid.ink/svg/${base64}`;
        
        // Replace the code block with a centered markdown image
        const imageMarkdown = `\n\n<div align="center">\n  ![Szakmai folyamatábra](${imageUrl})\n  <p><em>Vizuális szemléltetés</em></p>\n</div>\n\n`;
        
        newContent = newContent.replace(item.fullMatch, imageMarkdown);
        console.log(`[SVG-GEN] Successfully converted a diagram to SVG link.`);
      } catch (error) {
        console.error(`[SVG-GEN] Failed to convert Mermaid block:`, error);
      }
    }
    
    return newContent;
  }
}

export const enhancedModuleGenerator = new EnhancedModuleGenerator();