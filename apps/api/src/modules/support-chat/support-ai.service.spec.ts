/* eslint-disable @typescript-eslint/unbound-method */
import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupportChatRole } from '@prisma/client';
import { AppLogger } from '../logger/logger.service';
import { SupportAiService } from './support-ai.service';

const generateContent = jest.fn();

jest.mock(
  '@google/genai',
  () => ({
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent,
      },
    })),
  }),
  { virtual: true },
);

describe('SupportAiService', () => {
  let service: SupportAiService;
  let configService: ConfigService;
  let GoogleGenAI: jest.Mock;

  beforeEach(async () => {
    generateContent.mockReset();
    GoogleGenAI = (jest.requireMock('@google/genai') as { GoogleGenAI: jest.Mock }).GoogleGenAI;

    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'SUPPORT_AI_ENABLED') {
          return 'true';
        }
        if (key === 'GEMINI_MODEL') {
          return 'gemini-2.5-flash';
        }
        return undefined;
      }),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'GEMINI_API_KEY') {
          return 'test-key';
        }
        throw new Error(`Missing ${key}`);
      }),
    } as unknown as ConfigService;

    const loggerMock = {
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as AppLogger;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportAiService,
        { provide: ConfigService, useValue: configMock },
        { provide: AppLogger, useValue: loggerMock },
      ],
    }).compile();

    service = moduleRef.get(SupportAiService);
    configService = moduleRef.get(ConfigService);
  });

  it('generates a reply using Gemini', async () => {
    generateContent.mockResolvedValue({ text: 'Resposta pronta.' });
    (service as unknown as { client: { models: { generateContent: jest.Mock } } }).client = {
      models: { generateContent },
    };

    const text = await service.generateReply([
      {
        id: 'msg-1',
        sessionId: 'session-1',
        role: SupportChatRole.USER,
        content: 'Preciso de ajuda com pix.',
        createdAt: new Date(),
      },
    ]);

    expect(text).toBe('Resposta pronta.');
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.5-flash' }),
    );
  });

  it('blocks when support AI is disabled', async () => {
    (configService.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'SUPPORT_AI_ENABLED') {
        return 'false';
      }
      if (key === 'GEMINI_MODEL') {
        return 'gemini-2.5-flash';
      }
      return undefined;
    });

    const disabledService = new SupportAiService(
      configService,
      { warn: jest.fn(), error: jest.fn() } as unknown as AppLogger,
    );

    await expect(
      disabledService.generateReply([
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: SupportChatRole.USER,
          content: 'Oi',
          createdAt: new Date(),
        },
      ]),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
