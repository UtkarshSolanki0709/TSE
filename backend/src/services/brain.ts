import type { Document } from '@tse/shared';

export class Brain {
  private get apiKey() { return process.env.NVIDIA_API_KEY; }
  private baseURL = 'https://integrate.api.nvidia.com/v1';
  private model = 'minimaxai/minimax-m3';
  private timeoutMs = 60000;

  async synthesizeSearch(query: string, results: Document[]): Promise<{ answer: string; reasoning?: any }> {
    if (!this.apiKey) {
      console.error('[Brain] NVIDIA_API_KEY is not set. Loaded env keys:', Object.keys(process.env).filter(k => k.includes('NVIDIA')));
      return { answer: 'AI synthesis unavailable — NVIDIA_API_KEY not configured.' };
    }

    const context = results.map(r => `[Source: ${r.url}]\n${r.content.substring(0, 1000)}`).join('\n\n');

    const messages = [
      {
        role: 'system',
        content: "You are the 'Brain' of TinySearchEngine. Use the provided search context to answer the user's query meaningfully. Be concise and focus on facts found in the context."
      },
      {
        role: 'user',
        content: `Search Query: ${query}\n\nSearch Results:\n${context}`
      }
    ];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
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
        console.error(`NVIDIA API error ${response.status}:`, errText);
        return { answer: `AI synthesis failed (${response.status}). ${response.status === 429 ? 'Rate limited.' : 'Try again.'}` };
      }

      const result = await response.json();

      if (result.error) {
        return { answer: `AI synthesis error: ${result.error.message || 'Unknown'}` };
      }

      const message = result.choices?.[0]?.message;
      if (!message?.content) {
        return { answer: 'AI synthesis returned empty response.' };
      }

      return {
        answer: message.content,
        reasoning: message.reasoning_details || message.reasoning_content
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { answer: 'AI synthesis timed out (60s limit). The model may be overloaded.' };
      }
      console.error('Brain synthesis error:', error.message || error);
      return { answer: 'AI synthesis failed. Check server logs.' };
    }
  }
}

export const brain = new Brain();