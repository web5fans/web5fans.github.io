export interface SigningKeyData {
  privateKey: string;
  publicKey: string;
  createdAt: string;
}

const STORAGE_KEY = 'web5_signing_key';

export const storage = {
  getKey(): SigningKeyData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  setKey(keyData: SigningKeyData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keyData));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      throw new Error('Failed to save key data');
    }
  },

  removeKey(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      throw new Error('Failed to remove key data');
    }
  },

  hasKey(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
};