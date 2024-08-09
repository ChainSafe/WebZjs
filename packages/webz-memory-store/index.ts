import { IWalletStore } from 'webz-core';

export class MemoryStore implements IWalletStore {
  private store: Record<string, Uint8Array> = {};

  async get(key: string): Promise<Uint8Array> {
    return this.store[key];
  }

  async update(key: string, value: Uint8Array): Promise<void> {
    this.store[key] = value;
  }

  async clear(key: string): Promise<void> {
    delete this.store[key];
  }
}
