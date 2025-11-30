import type { NetworkKey } from './network';

// Default network to use when no network is selected
const DEFAULT_NETWORK: NetworkKey = 'monad';

// LocalStorage keys
const SMART_ACCOUNT_STORAGE_KEY = 'p2p_recovery_smart_account';

export interface StoredAccountData {
    smartAccountAddress?: string;
    ownerAddress?: string;
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
