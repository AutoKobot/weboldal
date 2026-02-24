/**
 * AI Queue Manager - Manages concurrent AI operations to prevent overload
 */

interface QueueItem {
  id: string;
  moduleId: number;
  title: string;
  content: string;
  subjectId: string;
  subjectName?: string;
  professionName?: string;
  moduleNumber?: number;
  customSystemMessage?: string;
  timestamp: number;
  resolve: (result: any) => void;
  reject: (error: any) => void;
}

export class AIQueueManager {
  private queue: QueueItem[] = [];
  private processing: Set<string> = new Set();
  private maxConcurrent = 1; // Process only one module at a time to prevent overload
  private processingInterval: NodeJS.Timeout | null = null;
  private queueFilePath = './ai_queue_backup.json';

  constructor() {
    this.loadQueueFromDisk();
    this.startProcessing();
    this.setupGracefulShutdown();
  }

  /**
   * Load queue from disk on startup
   */
  private loadQueueFromDisk() {
    try {
      import('fs').then(fs => {
        if (fs.existsSync(this.queueFilePath)) {
          const data = fs.readFileSync(this.queueFilePath, 'utf8');
          const savedQueue = JSON.parse(data);
          // Restore queue items but create new promises
          this.queue = savedQueue.map((item: any) => ({
            ...item,
            resolve: () => { }, // Will be handled when reprocessed
            reject: () => { }   // Will be handled when reprocessed
          }));
          console.log(`Restored ${this.queue.length} items from queue backup`);
          // Clean up the backup file
          fs.unlinkSync(this.queueFilePath);
        }
      }).catch(error => {
        console.error('Error loading fs module:', error);
      });
    } catch (error) {
      console.error('Error loading queue from disk:', error);
    }
  }

  /**
   * Save queue to disk
   */
  private async saveQueueToDisk() {
    try {
      const fs = await import('fs');
      const queueData = this.queue.map(item => ({
        id: item.id,
        moduleId: item.moduleId,
        title: item.title,
        content: item.content,
        subjectId: item.subjectId,
        customSystemMessage: item.customSystemMessage,
        timestamp: item.timestamp
      }));
      fs.writeFileSync(this.queueFilePath, JSON.stringify(queueData, null, 2));
    } catch (error) {
      console.error('Error saving queue to disk:', error);
    }
  }

  /**
   * Setup graceful shutdown to save queue
   */
  private setupGracefulShutdown() {
    const saveAndExit = async () => {
      console.log('Saving AI queue before shutdown...');
      await this.saveQueueToDisk();
      process.exit(0);
    };

    process.on('SIGINT', saveAndExit);
    process.on('SIGTERM', saveAndExit);
    process.on('exit', () => {
      // Synchronous save on exit
      try {
        import('fs').then(fs => {
          const queueData = this.queue.map(item => ({
            id: item.id,
            moduleId: item.moduleId,
            title: item.title,
            content: item.content,
            subjectId: item.subjectId,
            customSystemMessage: item.customSystemMessage,
            timestamp: item.timestamp
          }));
          fs.writeFileSync(this.queueFilePath, JSON.stringify(queueData, null, 2));
        });
      } catch (error) {
        console.error('Error saving queue on exit:', error);
      }
    });
  }

  /**
   * Add AI regeneration task to queue
   */
  async queueAIRegeneration(
    moduleId: number,
    title: string,
    content: string,
    subjectId: string,
    customSystemMessage?: string,
    subjectName?: string,
    professionName?: string,
    moduleNumber?: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `ai-regen-${moduleId}-${Date.now()}`;

      const queueItem: QueueItem = {
        id,
        moduleId,
        title,
        content,
        subjectId,
        subjectName,
        professionName,
        moduleNumber,
        customSystemMessage,
        timestamp: Date.now(),
        resolve,
        reject
      };

      this.queue.push(queueItem);
      console.log(`📝 Added to AI queue: "${title}" (Position: ${this.queue.length}, Total queued: ${this.queue.length})`);
    });
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      maxConcurrent: this.maxConcurrent,
      items: this.queue.map(item => ({
        id: item.id,
        moduleId: item.moduleId,
        title: item.title,
        timestamp: item.timestamp
      }))
    };
  }

  /**
   * Start processing queue
   */
  private startProcessing() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processNext();
    }, 2000); // Check every 2 seconds
  }

  /**
   * Process next item in queue
   */
  private async processNext() {
    if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.processing.add(item.id);
    const remainingCount = this.queue.length;
    console.log(`🔄 Processing AI task: "${item.title}" - Starting 4-step enhancement process... (${remainingCount} remaining in queue)`);

    // Process the item WITHOUT async/await to prevent parallel processing
    this.performAIGeneration(item)
      .then(result => {
        console.log(`✅ Completed AI task: "${item.title}" (${this.queue.length} remaining in queue)`);
        item.resolve(result);
        this.processing.delete(item.id);
      })
      .catch(error => {
        console.error(`❌ AI generation failed for "${item.title}":`, error);
        item.reject(error);
        this.processing.delete(item.id);
      });
  }

  /**
   * Perform the actual AI generation
   */
  private async performAIGeneration(item: QueueItem): Promise<any> {
    const { storage } = await import('./storage');

    try {
      // Build comprehensive context with all available information
      let fullContext = '';

      if (item.professionName && item.subjectName) {
        // Use already provided context from queue
        fullContext = `Szakma: ${item.professionName} | Tantárgy: ${item.subjectName}`;
        if (item.moduleNumber) {
          fullContext += ` | ${item.moduleNumber}. modul`;
        }
      } else {
        // Fallback: fetch context from database
        const subject = await storage.getSubject(parseInt(item.subjectId));
        if (subject) {
          const profession = await storage.getProfession(subject.professionId);
          fullContext = `Szakma: ${profession?.name || 'Ismeretlen'} | Tantárgy: ${subject.name}`;
        }
      }

      // Enhanced context message that includes module metadata
      const contextualSystemMessage = item.customSystemMessage ?
        `${item.customSystemMessage}\n\nKONTEXTUS: ${fullContext}` :
        `Frissítsd a következő tananyag modult. KONTEXTUS: ${fullContext}`;

      // Generate enhanced content with full context and custom system message
      const { enhancedModuleGenerator } = await import('./enhanced-module-generator');

      // Record AI generation start for cost tracking
      await this.recordAIGenerationCost('openai', 'module_generation', 0.05);

      const enhancedContent = await enhancedModuleGenerator.generateEnhancedModule(
        item.title,
        item.content,
        fullContext,
        contextualSystemMessage,
        item.subjectName,
        item.professionName
      );

      // Record additional costs for web search and YouTube API calls
      await this.recordAIGenerationCost('dataseo', 'web_search', 0.02);
      await this.recordAIGenerationCost('youtube', 'video_search', 0.01);

      // Apply automatic Mermaid SVG conversion to all content versions
      const enhancedModuleGeneratorModule = await import('./enhanced-module-generator');
      const moduleGenerator = enhancedModuleGeneratorModule.enhancedModuleGenerator;

      let finalContent = enhancedContent.detailedVersion || enhancedContent.conciseVersion || item.content;
      let finalConciseContent = enhancedContent.conciseVersion || null;
      let finalDetailedContent = enhancedContent.detailedVersion || null;

      // Convert Mermaid diagrams to SVG images in all content versions
      if (finalContent.includes('```mermaid')) {
        console.log('Converting Mermaid diagrams to SVG images...');
        finalContent = await moduleGenerator.convertMermaidToSVGImages(finalContent);
      }

      if (finalConciseContent && finalConciseContent.includes('```mermaid')) {
        finalConciseContent = await moduleGenerator.convertMermaidToSVGImages(finalConciseContent);
      }

      if (finalDetailedContent && finalDetailedContent.includes('```mermaid')) {
        finalDetailedContent = await moduleGenerator.convertMermaidToSVGImages(finalDetailedContent);
      }

      // DEBUG: Check bold links before database update
      const contentLinkCount = (finalContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length;
      const conciseLinkCount = finalConciseContent ? (finalConciseContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length : 0;
      const detailedLinkCount = finalDetailedContent ? (finalDetailedContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length : 0;

      console.log(`🔗 QUEUE DEBUG: Before DB update - Content has ${contentLinkCount} bold links`);
      console.log(`🔗 QUEUE DEBUG: Before DB update - Concise has ${conciseLinkCount} bold links`);
      console.log(`🔗 QUEUE DEBUG: Before DB update - Detailed has ${detailedLinkCount} bold links`);

      // Update module with AI enhanced content and converted SVG images
      const updateData = {
        content: finalContent,
        conciseContent: finalConciseContent,
        detailedContent: finalDetailedContent,
        keyConceptsData: enhancedContent.keyConceptsWithVideos || null,
        generatedQuizzes: enhancedContent.generatedQuizzes,
        isPublished: true
      };

      const updatedModule = await storage.updateModule(item.moduleId, updateData);

      // DEBUG: Check if links survived database update
      const dbContentLinkCount = updatedModule.content ? (updatedModule.content.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length : 0;
      const dbConciseLinkCount = updatedModule.conciseContent ? (updatedModule.conciseContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length : 0;
      const dbDetailedLinkCount = updatedModule.detailedContent ? (updatedModule.detailedContent.match(/\*\*\[[^\]]+\]\([^)]+\)\*\*/g) || []).length : 0;

      console.log(`🔗 QUEUE DEBUG: After DB update - Content has ${dbContentLinkCount} bold links`);
      console.log(`🔗 QUEUE DEBUG: After DB update - Concise has ${dbConciseLinkCount} bold links`);
      console.log(`🔗 QUEUE DEBUG: After DB update - Detailed has ${dbDetailedLinkCount} bold links`);

      console.log(`Successfully completed AI generation for module ${item.moduleId}`);

      return {
        success: true,
        module: updatedModule,
        message: 'Modul sikeresen újragenerálva'
      };

    } catch (enhancementError) {
      console.error(`Enhancement error for module ${item.moduleId}:`, enhancementError);

      // Fallback: just mark as published without enhancement
      const fallbackUpdate = { isPublished: true };
      const updatedModule = await storage.updateModule(item.moduleId, fallbackUpdate);

      return {
        success: true,
        module: updatedModule,
        message: 'Modul publikálva (AI fejlesztés sikertelen)',
        warning: 'AI fejlesztés nem sikerült, eredeti tartalom megtartva'
      };
    }
  }

  /**
   * Record AI generation cost for tracking
   */
  private async recordAIGenerationCost(provider: string, service: string, estimatedCost: number): Promise<void> {
    try {
      const { storage } = await import('./storage');
      if (storage.recordSimpleApiCall) {
        await storage.recordSimpleApiCall(provider, service, estimatedCost);
      }
    } catch (error) {
      console.error('Cost tracking failed (non-critical):', error);
    }
  }

  /**
   * Clear queue and stop processing
   */
  shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Reject all pending items
    this.queue.forEach(item => {
      item.reject(new Error('Queue shutdown'));
    });

    this.queue = [];
    this.processing.clear();
  }
}

// Singleton instance
export const aiQueueManager = new AIQueueManager();