import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import * as https from 'https';
import { extname } from 'path';

type EfiHttpRequest = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  accessToken?: string;
  timeoutMs?: number;
};

const EFI_BASE_URLS = {
  sandbox: 'https://api-pix-h.gerencianet.com.br',
  prod: 'https://api-pix.gerencianet.com.br',
};

@Injectable()
export class EfiHttpService {
  private agent?: https.Agent;
  private baseUrl?: string;

  constructor(private readonly configService: ConfigService) {}

  async request<T>(request: EfiHttpRequest): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const url = new URL(request.path, baseUrl);
    const payload = request.body ? JSON.stringify(request.body) : undefined;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(payload ? { 'Content-Type': 'application/json' } : {}),
      ...(request.headers ?? {}),
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    if (request.accessToken) {
      headers['Authorization'] = `Bearer ${request.accessToken}`;
    }

    const options: https.RequestOptions = {
      method: request.method,
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      headers,
      agent: this.getAgent(),
    };

    return new Promise<T>((resolve, reject) => {
      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const statusCode = res.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            reject(
              new InternalServerErrorException(
                `Efi request failed (${statusCode}): ${text || 'empty response'}`,
              ),
            );
            return;
          }
          if (!text) {
            resolve({} as T);
            return;
          }
          try {
            resolve(JSON.parse(text) as T);
          } catch (error) {
            reject(
              new InternalServerErrorException(
                `Efi response parse error: ${
                  error instanceof Error ? error.message : 'unknown'
                }`,
              ),
            );
          }
        });
      });

      req.on('error', (error) => {
        reject(
          new InternalServerErrorException(
            `Efi request error: ${error instanceof Error ? error.message : 'unknown'}`,
          ),
        );
      });

      if (request.timeoutMs) {
        req.setTimeout(request.timeoutMs, () => {
          req.destroy(new Error('Efi request timeout'));
        });
      }

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  }

  private getBaseUrl() {
    if (this.baseUrl) {
      return this.baseUrl;
    }
    const env = this.configService.get<string>('EFI_ENV') ?? 'sandbox';
    this.baseUrl = env === 'prod' ? EFI_BASE_URLS.prod : EFI_BASE_URLS.sandbox;
    return this.baseUrl;
  }

  private getAgent() {
    if (this.agent) {
      return this.agent;
    }
    const certPath = this.configService.get<string>('EFI_CERT_PATH');
    if (!certPath) {
      throw new InternalServerErrorException('EFI_CERT_PATH is required for Efi Pix.');
    }
    const certBuffer = readFileSync(certPath);
    const extension = extname(certPath).toLowerCase();
    const agentOptions: https.AgentOptions =
      extension === '.p12' || extension === '.pfx'
        ? { pfx: certBuffer }
        : { cert: certBuffer, key: certBuffer };
    this.agent = new https.Agent(agentOptions);
    return this.agent;
  }
}
