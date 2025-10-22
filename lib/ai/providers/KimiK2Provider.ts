import axios from 'axios';
import { LLMProvider, BusinessData, GenerationResult } from '../LLMProvider';

export class KimiK2Provider extends LLMProvider {
  private baseURL: string;

  constructor(apiKey: string) {
    super(apiKey, 'KimiK2');
    this.baseURL = 'https://api.moonshot.cn/v1';
  }

  async generateSite(businessData: BusinessData): Promise<GenerationResult> {
    const startTime = Date.now();

    try {
      const prompt = this.createPrompt(businessData);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'system',
              content: 'You are an expert web developer and designer specializing in creative and modern websites. Always respond with valid JSON containing complete website code. Never include explanations outside the JSON structure.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 8000,
          temperature: 0.8, // Higher temperature for more creativity
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutes timeout
        }
      );

      const generatedContent = response.data.choices[0]?.message?.content;

      if (!generatedContent) {
        throw new Error('No content received from KimiK2 API');
      }

      const result = this.parseAIResponse(generatedContent);

      if (result.success && result.website) {
        result.website.metadata.provider = this.providerName;
        result.website.metadata.generatedAt = new Date().toISOString();
        result.generationTime = Date.now() - startTime;
      }

      return result;

    } catch (error) {
      console.error('KimiK2 API error:', error);

      // If API fails, return a fallback website
      const fallbackWebsite = this.generateFallbackWebsite(businessData);

      return {
        success: true,
        website: {
          ...fallbackWebsite,
          metadata: {
            ...fallbackWebsite.metadata,
            provider: `${this.providerName} (Fallback)`,
            generationTime: Date.now() - startTime,
          },
        },
        generationTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'KimiK2 API failed',
      };
    }
  }

  protected parseAIResponse(response: string): GenerationResult {
    try {
      // Try to extract JSON from the response
      let jsonStr = response;

      // Remove markdown code blocks if present
      if (response.includes('```json')) {
        const start = response.indexOf('```json') + 7;
        const end = response.indexOf('```', start);
        if (end !== -1) {
          jsonStr = response.substring(start, end);
        }
      } else if (response.includes('```')) {
        const start = response.indexOf('```') + 3;
        const end = response.indexOf('```', start);
        if (end !== -1) {
          jsonStr = response.substring(start, end);
        }
      }

      // Clean up the JSON string
      jsonStr = jsonStr.trim();

      // Try to find JSON object boundaries
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      const websiteData = JSON.parse(jsonStr);

      // Validate required fields
      if (!websiteData.html || !websiteData.css || !websiteData.js) {
        throw new Error('Missing required fields in generated website');
      }

      return {
        success: true,
        website: websiteData,
      };
    } catch (error) {
      console.error('Error parsing KimiK2 response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse KimiK2 response',
      };
    }
  }
}