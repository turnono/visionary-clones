import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiKeyService {
  private readonly STORAGE_KEY = 'google_ai_api_key';
  
  // Signal to track the current API key
  apiKey = signal<string | null>(this.getStoredApiKey());
  
  constructor() {}
  
  private getStoredApiKey(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.STORAGE_KEY);
    }
    return null;
  }
  
  setApiKey(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, key);
    }
    this.apiKey.set(key);
  }
  
  clearApiKey(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this.apiKey.set(null);
  }
  
  hasApiKey(): boolean {
    return !!this.apiKey();
  }
}
