import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';

import type { SidebarStore } from '../store';
import type { State as NostrSettingsState } from '../store/modules/nostr';
import type { LocalStorageService } from './local-storage';
import type { NostrProfileService } from './nostr-profile';

const STORAGE_KEY = 'nostr.settings';

type NostrSettingsLocalStorage = Omit<NostrSettingsState, 'privateKey'> & {
  privateKeyHex: string | null;
};

/**
 * Service for managing Nostr related settings and persisting them to local storage.
 */
// @inject
export class NostrSettingsService {
  private _storage: LocalStorageService;
  private _store: SidebarStore;
  private _nostrProfileService: NostrProfileService;

  /**
   * @param localStorage - Storage used to persist the settings
   */
  constructor(
    localStorage: LocalStorageService,
    store: SidebarStore,
    nostrProfileService: NostrProfileService,
  ) {
    this._storage = localStorage;
    this._store = store;
    this._nostrProfileService = nostrProfileService;

    // Load initial settings from localStorage
    const privateKeyHex = this.getPrivateKeyHex();

    if (privateKeyHex) {
      const privateKey = hexToBytes(privateKeyHex);
      const publicKeyHex = getPublicKey(privateKey);
      
      this._store.setPrivateKey(privateKey);
      this._store.setPublicKeyHex(publicKeyHex);
      this._store.setConnectMode('nsec');
      // Initialize profile loading
      this._nostrProfileService.loadProfile(publicKeyHex);
    }
  }

  /**
   * Get the current private key hex string
   */
  getPrivateKeyHex(): string | null {
    let saved = null;

    try {
      const savedString = this._storage.getItem(STORAGE_KEY);

      if (savedString) {
        saved = JSON.parse(savedString) as NostrSettingsLocalStorage;
      }
    } catch (e) {
      console.error('Failed to load nostr settings from localStorage:', e);
    }

    return saved?.privateKeyHex ?? null;
  }

  /**
   * Set the private key hex string
   */
  setPrivateKey(privateKey: Uint8Array | null) {
    const privateKeyHex = privateKey ? bytesToHex(privateKey) : null;
    const publicKeyHex = privateKey ? getPublicKey(privateKey) : null;
    
    const settings: NostrSettingsLocalStorage = {
      privateKeyHex,
      publicKeyHex,
      connectMode: 'nsec',
      profile: null,
      nostrProfileUrl: this._store.getNostrProfileUrl(),
      nostrSearchUrl: this._store.getNostrSearchUrl(),
      nostrEventUrl: this._store.getNostrEventUrl(),
    };

    try {
      this._storage.setItem(STORAGE_KEY, JSON.stringify(settings));

      this._store.setPrivateKey(privateKey);
      this._store.setPublicKeyHex(publicKeyHex);
      this._store.setConnectMode('nsec');
      
      // Trigger profile loading when private key is set
      if (publicKeyHex) {
        this._nostrProfileService.loadProfile(publicKeyHex);
      } else {
        this._nostrProfileService.clearProfile();
      }
    } catch (e) {
      console.error('Failed to save nostr settings to localStorage:', e);
    }
  }
}
