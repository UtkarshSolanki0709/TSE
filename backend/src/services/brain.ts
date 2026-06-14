import type { Document } from '@tse/shared';

export class Brain {
  private apiKey = process.env.OPENROUTER_API_KEY;
  private model = "nvidia/nemotron-3-super-120b-a12b:free";

  /**
   * Generates a "meaningful" answer based on search results.
   */
  async synthesizeSearch(query: string, results: Document[]): Promise<{ answer: string; reasoning?: any }> {
    if (!this.apiKey) {
      throw new Error("OpenRouter API key not configured");
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
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": this.model,
          "messages": messages,
          "reasoning": { "enabled": true }
        })
      });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || "OpenRouter error");
      }

      const message = result.choices[0].message;
      
      return {
        answer: message.content,
        reasoning: message.reasoning_details
      };
    } catch (error) {
      console.error("Brain synthesis error:", error);
      return { answer: "I'm sorry, I couldn't synthesize an answer right now." };
    }
  }
}

export const brain = new Brain();
