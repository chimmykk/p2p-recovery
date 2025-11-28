import type { NetworkKey } from './network';

// Default network to use when no network is selected
const DEFAULT_NETWORK: NetworkKey = 'monad';

// LocalStorage keys
const PRIVATE_KEY_STORAGE_KEY = 'p2p_recovery_private_key';
const SMART_ACCOUNT_STORAGE_KEY = 'p2p_recovery_smart_account';

export interface StoredAccountData {
    privateKey: string;
    smartAccountAddress?: string;
    ownerAddress?: string;
}

/**
 * Save private key to localStorage
 */
export function savePrivateKey(privateKey: string): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKey);
    } catch (error) {
        console.error('Error saving private key:', error);
        throw new Error('Failed to save private key to localStorage');
    }
}

/**
 * Get private key from localStorage
 */
export function getPrivateKey(): string | null {
    if (typeof window === 'undefined') return null;

    try {
        return localStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
    } catch (error) {
        console.error('Error retrieving private key:', error);
        return null;
    }
}

/**
 * Clear private key from localStorage
 */
export function clearPrivateKey(): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(PRIVATE_KEY_STORAGE_KEY);
        localStorage.removeItem(SMART_ACCOUNT_STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing private key:', error);
        throw new Error('Failed to clear private key from localStorage');
    }
}

/**
 * Save smart account data to localStorage
 */
export function saveSmartAccountData(data: Partial<StoredAccountData>): void {
    if (typeof window === 'undefined') return;

    try {
        const existing = getSmartAccountData();
        const updated = { ...existing, ...data };
        localStorage.setItem(SMART_ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving smart account data:', error);
        throw new Error('Failed to save smart account data to localStorage');
    }
}

/**
 * Get smart account data from localStorage
 */
export function getSmartAccountData(): StoredAccountData | null {
    if (typeof window === 'undefined') return null;

    try {
        const data = localStorage.getItem(SMART_ACCOUNT_STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error retrieving smart account data:', error);
        return null;
    }
}

/**
 * Check if private key exists in localStorage
 */
export function hasPrivateKey(): boolean {
    if (typeof window === 'undefined') return false;

    const key = getPrivateKey();
    return !!key && key.length > 0;
}

/**
 * Validate private key format
 */
export function isValidPrivateKey(key: string): boolean {
    // Check if it's a valid hex string (with or without 0x prefix)
    const hexPattern = /^(0x)?[0-9a-fA-F]{64}$/;
    return hexPattern.test(key);
}

/**
 * Format private key to ensure 0x prefix
 */
export function formatPrivateKey(key: string): string {
    const cleanKey = key.trim();
    return cleanKey.startsWith('0x') ? cleanKey : `0x${cleanKey}`;
}

/**
 * Save selected network
 */
export function saveSelectedNetwork(network: NetworkKey): void {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem('p2p_recovery_network', network);
    } catch (error) {
        console.error('Error saving network:', error);
    }
}

/**
 * Get selected network
 */
export function getSelectedNetwork(): NetworkKey {
    if (typeof window === 'undefined') return DEFAULT_NETWORK;

    try {
        const network = localStorage.getItem('p2p_recovery_network');
        // Validate that the network is a valid NetworkKey
        if (network === 'bnb' || network === 'avax' || network === 'monad' || network === 'polygon' || network === 'optimism') {
            return network as NetworkKey;
        }
        return DEFAULT_NETWORK;
    } catch (error) {
        console.error('Error retrieving network:', error);
        return DEFAULT_NETWORK;
    }
}
