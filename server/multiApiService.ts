import { storage } from './storage';
import axios from 'axios';

// Multi-API Service for intelligent task routing
export class MultiApiService {
  
  // Get API keys from system settings
  async getApiKey(keyName: string): Promise<string | null> {
    const setting = await storage.getSystemSetting(keyName);
    return setting?.value || null;
  }

  // Internet search using SerpAPI
  async searchInternet(query: string): Promise<any> {
    // Try environment variables first, then fall back to database settings
    const dataForSeoLogin = process.env.DATAFORSEO_LOGIN || await this.getApiKey('dataforseo_login');
    const dataForSeoPassword = process.env.DATAFORSEO_PASSWORD || await this.getApiKey('dataforseo_password');
    
    if (!dataForSeoLogin || !dataForSeoPassword) {
      throw new Error('DataForSEO credentials not configured. Please set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables.');
    }

    try {
      const credentials = Buffer.from(`${dataForSeoLogin}:${dataForSeoPassword}`).toString('base64');
      
      // Clean query to be a proper search term (max 200 chars for better context)
      const cleanQuery = query.length > 200 ? query.substring(0, 200).trim() : query.trim();
      
      // Post search task
      const taskResponse = await axios.post('https://api.dataforseo.com/v3/serp/google/organic/task_post', [{
        keyword: cleanQuery,
        location_code: 2348, // Hungary
        language_code: "hu",
        device: "desktop",
        depth: 10
      }], {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('DataForSEO task post status:', taskResponse.data.status_code);
      
      const taskId = taskResponse.data.tasks?.[0]?.id;
      if (!taskId) {
        throw new Error('Failed to create search task');
      }
      
      // Wait for processing with retry mechanism
      let resultsResponse;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        
        resultsResponse = await axios.get(`https://api.dataforseo.com/v3/serp/google/organic/task_get/regular/${taskId}`, {
          headers: {
            'Authorization': `Basic ${credentials}`
          }
        });

        console.log(`DataForSEO attempt ${attempts + 1}, status:`, resultsResponse.data.status_code);
        
        // Check if task is complete (status 20000) and has results
        if (resultsResponse.data.status_code === 20000 && 
            resultsResponse.data.tasks?.[0]?.result?.[0]?.items) {
          break;
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          console.log('Max attempts reached, proceeding with available data');
          break;
        }
      }
      
      const results = resultsResponse?.data?.tasks?.[0]?.result?.[0]?.items || [];
      return results.filter((item: any) => item.type === 'organic').map((item: any) => ({
        title: item.title,
        link: item.url,
        snippet: item.description,
        position: item.rank_absolute
      }));
    } catch (error) {
      console.error('DataForSEO search error:', error);
      throw new Error('Failed to search internet with DataForSEO');
    }
  }

  // YouTube video search using YouTube Data API
  async searchYoutube(query: string): Promise<any> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    // Ensure proper UTF-8 encoding for Hungarian characters
    const encodedQuery = encodeURIComponent(query);
    console.log(`YouTube API - Searching for: "${query}" (encoded: ${encodedQuery})`);
    
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          key: apiKey,
          maxResults: 5,
          order: 'relevance',
          regionCode: 'HU',
          relevanceLanguage: 'hu'
        }
      });
      
      console.log(`YouTube API - Found ${response.data.items?.length || 0} videos`);
      return response.data.items || [];
    } catch (error: any) {
      console.error('YouTube API search error:', error.response?.data || error.message);
      throw new Error(`Failed to search YouTube: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Text-to-speech using ElevenLabs
  async generateSpeech(text: string, voice: string = 'Bella'): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.log('ElevenLabs API key not available, TTS service unavailable');
      throw new Error('ElevenLabs API key not configured');
    }

    // Map voice names to ElevenLabs voice IDs (pre-made voices)
    const voiceMap: { [key: string]: string } = {
      'Bella': 'ThT5KcBeYPX3keUQqHPh', // Dorothy - clear female voice
      'default': 'ThT5KcBeYPX3keUQqHPh'
    };
    
    const voiceId = voiceMap[voice] || voiceMap['default'];

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true
          },
          pronunciation_dictionary_locators: [],
          seed: null,
          previous_text: null,
          next_text: null,
          previous_request_ids: [],
          next_request_ids: []
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          responseType: 'arraybuffer'
        }
      );
      
      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw new Error('Failed to generate speech');
    }
  }

  // Enhanced content generation with internet search
  async generateEnhancedContent(
    query: string, 
    moduleContent?: string
  ): Promise<{
    content: string;
    sources: any[];
    youtubeVideos: any[];
  }> {
    try {
      // Parallel search for internet and YouTube content
      const [searchResults, youtubeResults] = await Promise.all([
        this.searchInternet(query).catch(() => []),
        this.searchYoutube(query).catch(() => [])
      ]);

      // Format search results for GPT
      const searchContext = searchResults.map((result: any) => 
        `${result.title}: ${result.snippet}`
      ).join('\n');

      const youtubeContext = youtubeResults.map((video: any) => 
        `YouTube: ${video.snippet.title} - ${video.snippet.description.substring(0, 200)}...`
      ).join('\n');

      return {
        content: `Internetes keresési eredmények:\n${searchContext}\n\nYouTube videók:\n${youtubeContext}`,
        sources: searchResults,
        youtubeVideos: youtubeResults
      };
    } catch (error) {
      console.error('Enhanced content generation error:', error);
      return {
        content: '',
        sources: [],
        youtubeVideos: []
      };
    }
  }

  // Task-based routing system
  async routeTask(userMessage: string, taskType: string = 'chat'): Promise<any> {
    const message = userMessage.toLowerCase();
    
    // Detect task type based on user message
    if (message.includes('keres') || message.includes('internet') || message.includes('google')) {
      return await this.handleSearchTask(userMessage);
    }
    
    if (message.includes('youtube') || message.includes('videó')) {
      return await this.handleYoutubeTask(userMessage);
    }
    
    if (message.includes('hang') || message.includes('beszéd') || message.includes('felolvas')) {
      return await this.handleSpeechTask(userMessage);
    }
    
    if (message.includes('tananyag') || message.includes('kurzus') || message.includes('oktat')) {
      return await this.handleContentGenerationTask(userMessage);
    }
    
    // Default to regular chat
    return { type: 'chat', data: null };
  }

  private async handleSearchTask(query: string) {
    const results = await this.searchInternet(query);
    return { type: 'search', data: results };
  }

  private async handleYoutubeTask(query: string) {
    const results = await this.searchYoutube(query);
    return { type: 'youtube', data: results };
  }

  private async handleSpeechTask(text: string) {
    const audioBuffer = await this.generateSpeech(text);
    return { type: 'speech', data: audioBuffer };
  }

  private async handleContentGenerationTask(query: string) {
    const enhanced = await this.generateEnhancedContent(query);
    return { type: 'enhanced_content', data: enhanced };
  }
}

export const multiApiService = new MultiApiService();