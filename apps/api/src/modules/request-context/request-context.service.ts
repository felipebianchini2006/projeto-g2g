import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export type RequestContext = {
  requestId: string;
  correlationId: string;
  userId?: string;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return this.storage.getStore();
  }

  set(values: Partial<RequestContext>) {
    const store = this.storage.getStore();
    if (!store) {
      return;
    }
    Object.assign(store, values);
  }
}
