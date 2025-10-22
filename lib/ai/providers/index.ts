import { LLMProvider } from '../LLMProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { KimiK2Provider } from './KimiK2Provider';
import { QwenProvider } from './QwenProvider';
import { ZaiProvider } from './ZaiProvider';

export { DeepSeekProvider, KimiK2Provider, QwenProvider, ZaiProvider };

export class LLMProviderFactory {
  static createProvider(providerType: string, apiKey: string): LLMProvider {
    switch (providerType.toLowerCase()) {
      case 'deepseek':
        return new DeepSeekProvider(apiKey);
      case 'kimik2':
        return new KimiK2Provider(apiKey);
      case 'qwen':
        return new QwenProvider(apiKey);
      case 'zai':
        return new ZaiProvider(apiKey);
      default:
        throw new Error(`Unsupported LLM provider: ${providerType}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['deepseek', 'kimik2', 'qwen', 'zai'];
  }
}

export const createLLMProvider = LLMProviderFactory.createProvider;
export const getSupportedProviders = LLMProviderFactory.getSupportedProviders;