import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupportChatRole, type SupportChatMessage } from '@prisma/client';
import type { GoogleGenAI } from '@google/genai';

import { AppLogger } from '../logger/logger.service';

const MAX_HISTORY = 16;
const SYSTEM_PROMPT = [
  'Voce e o suporte oficial da plataforma Meoww Games.',
  'Responda com clareza, passos curtos e em portugues.',
  'Nao invente politicas. Se nao souber, peca detalhes ou direcione para ticket.',
  'Nunca solicite senhas, tokens, codigos, dados bancarios ou informacoes sensiveis.',
  'Quando apropriado, sugira abrir um ticket em /conta/tickets para acompanhamento humano.',
].join(' ');

const PRODUCT_CONTEXT = `
Contexto do produto:
- Compras via checkout (/checkout) com Pix.
- Status do pedido: CREATED, AWAITING_PAYMENT, PAID, IN_DELIVERY, DELIVERED, COMPLETED, DISPUTED, REFUNDED, CANCELLED.
- Disputas: comprador pode abrir disputa em pedidos entregues; admin resolve com release/refund.
- Tickets: usuarios podem abrir tickets e trocar mensagens com o suporte humano.
`.trim();

type GeminiContent = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

@Injectable()
export class SupportAiService {
  private client: GoogleGenAI | null = null;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.enabled = (this.configService.get<string>('SUPPORT_AI_ENABLED') ?? 'true') === 'true';
    this.model = this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash';
    this.apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
  }

  async generateReply(messages: SupportChatMessage[]) {
    if (!this.enabled) {
      throw new ServiceUnavailableException('Support AI is disabled.');
    }

    const client = await this.getClient();
    const contents = this.buildContents(messages);
    const response = await client.models.generateContent({
      model: this.model,
      contents,
      systemInstruction: `${SYSTEM_PROMPT}\n\n${PRODUCT_CONTEXT}`,
    });

    const text = this.extractText(response);
    if (!text) {
      this.logger.warn('Gemini returned empty response.', 'SupportAiService');
      throw new ServiceUnavailableException('Support AI failed to answer.');
    }

    return text;
  }

  private async getClient() {
    if (this.client) {
      return this.client;
    }
    try {
      const module = await import('@google/genai');
      this.client = new module.GoogleGenAI({ apiKey: this.apiKey });
      return this.client;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load Gemini SDK';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(message, stack, 'SupportAiService');
      throw new ServiceUnavailableException('Support AI is unavailable.');
    }
  }

  private buildContents(messages: SupportChatMessage[]): GeminiContent[] {
    const recent = [...messages]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-MAX_HISTORY);

    return recent.map((message) => ({
      role: this.mapRole(message.role),
      parts: [{ text: this.mapContent(message) }],
    }));
  }

  private mapRole(role: SupportChatRole): 'user' | 'model' {
    if (role === SupportChatRole.AI) {
      return 'model';
    }
    return 'user';
  }

  private mapContent(message: SupportChatMessage) {
    if (message.role === SupportChatRole.SYSTEM) {
      return `Nota interna: ${message.content}`;
    }
    return message.content;
  }

  private extractText(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const directText = (payload as { text?: unknown }).text;
    if (typeof directText === 'string' && directText.trim()) {
      return directText.trim();
    }

    const response = (payload as { response?: { text?: () => string } }).response;
    if (response?.text) {
      const text = response.text();
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }
    }

    const candidates = (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
    const candidateText = candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof candidateText === 'string' && candidateText.trim()) {
      return candidateText.trim();
    }

    return null;
  }
}
