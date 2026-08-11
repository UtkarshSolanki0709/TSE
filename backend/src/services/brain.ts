import type { Document } from '@tse/shared';

export interface InsightProvider {
  id: string;
  label: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  keyPlaceholder: string;
}

// All use OpenAI-compatible /chat/completions. One code path, swap base URL + model.
export const INSIGHT_PROVIDERS: InsightProvider[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-001',
    models: [
      'google/gemini-2.0-flash-001',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-3.5-haiku',
      'openai/gpt-4o-mini',
      'openai/o1-mini',
      'meta-llama/llama-4-maverick',
      'meta-llama/llama-3.3-70b-instruct',
    ],
    keyPlaceholder: 'sk-or-...',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'o1-mini', 'o3-mini'],
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-latest', 'claude-3-opus-latest'],
    keyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash-lite'],
    keyPlaceholder: 'AIza...',
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.1-8b-instruct',
    models: [
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-405b-instruct',
      'mistralai/mistral-7b-instruct-v0.3',
      'nvidia/llama-3.1-nemotron-70b-instruct',
    ],
    keyPlaceholder: 'nvapi-...',
  },
  {
    id: 'groq',
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    keyPlaceholder: 'gsk_...',
  },
  {
    id: 'together',
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-R1',
    ],
    keyPlaceholder: '...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    keyPlaceholder: 'sk-...',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    models: [],
    keyPlaceholder: 'API key',
  },
];

const PROVIDER_MAP = new Map(INSIGHT_PROVIDERS.map(p => [p.id, p]));

export interface InsightRequest {
  provider?: string;
  model?: string;
  apiKey?: string;
}

export class Brain {
  private timeoutMs = 60000;

  private resolveProvider(req: InsightRequest): { baseUrl: string; model: string; key: string | undefined } {
    const id = req.provider || process.env.INSIGHT_PROVIDER || 'openrouter';
    const provider = PROVIDER_MAP.get(id) || PROVIDER_MAP.get('openrouter')!;
    const baseUrl = provider.id === 'custom' && req.apiKey !== undefined
      ? (process.env.INSIGHT_CUSTOM_BASEURL || '')
      : provider.baseUrl;
    const model = req.model || process.env.INSIGHT_MODEL || provider.defaultModel;
    const key = req.apiKey || process.env.INSIGHT_API_KEY || this.providerEnvKey(id);
    return { baseUrl, model, key };
  }

  private providerEnvKey(id: string): string | undefined {
    const map: Record<string, string> = {
      openai: process.env.OPENAI_API_KEY || process.env.INSIGHT_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || process.env.INSIGHT_API_KEY || '',
      gemini: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.INSIGHT_API_KEY || '',
      nvidia: process.env.NVIDIA_API_KEY || process.env.INSIGHT_API_KEY || '',
      groq: process.env.GROQ_API_KEY || process.env.INSIGHT_API_KEY || '',
      together: process.env.TOGETHER_API_KEY || process.env.INSIGHT_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || process.env.INSIGHT_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || process.env.INSIGHT_API_KEY || '',
      custom: process.env.INSIGHT_API_KEY || '',
    };
    const k = map[id];
    return k && k.length > 0 ? k : undefined;
  }

  async synthesizeSearch(
    query: string,
    results: Document[],
    req: InsightRequest = {}
  ): Promise<{ answer: string; reasoning?: any }> {
    const { baseUrl, model, key } = this.resolveProvider(req);

    if (!baseUrl || !key) {
      const missing = !baseUrl ? 'base URL' : 'API key';
      const id = req.provider || process.env.INSIGHT_PROVIDER || 'openrouter';
      console.error(`[Insight] Missing ${missing} for provider "${id}".`);
      return {
        answer: `Insight unavailable — no ${missing} for provider "${id}". ` +
                `${!key ? 'Add your key in the frontend (BYOK) or set INSIGHT_API_KEY on the server.' : 'Set a custom base URL.'}`,
      };
    }

    const context = results.map(r => `[Source: ${r.url}]\n${r.content.substring(0, 1000)}`).join('\n\n');

    const messages = [
      {
        role: 'system',
        content:
          "You are the 'Insight' engine of TinySearchEngine. Use the provided search context to answer the user's query. Be concise and focus on facts found in the context.",
      },
      { role: 'user', content: `Search Query: ${query}\n\nSearch Results:\n${context}` },
    ];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 1.0,
          top_p: 0.95,
          max_tokens: 8192,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        console.error(`[Insight] ${response.status} from ${baseUrl}:`, errText);
        return {
          answer: `Insight failed (${response.status}) using ${req.provider || 'openrouter'}/${model}. ` +
                  `${response.status === 429 ? 'Rate limited.' : response.status === 401 ? 'Check your API key.' : 'Try again.'}`,
        };
      }

      const result = await response.json();

      if (result.error) {
        return { answer: `Insight error: ${result.error.message || 'Unknown'}` };
      }

      const message = result.choices?.[0]?.message;
      if (!message?.content) {
        return { answer: 'Insight returned empty response.' };
      }

      return {
        answer: message.content,
        reasoning: message.reasoning_details || message.reasoning_content,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { answer: 'Insight timed out (60s limit). The model may be overloaded.' };
      }
      console.error('[Insight] synthesis error:', error.message || error);
      return { answer: 'Insight failed. Check server logs.' };
    }
  }
}

export const brain = new Brain();
