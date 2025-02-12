import { generateSecretKey, getPublicKey } from 'nostr-tools';
import { BunkerSigner, parseBunkerInput } from 'nostr-tools/nip46'

import type { SidebarStore } from '../store';
import type { NostrState as NostrSettingsState } from '../store/modules/nostr';

import type { LocalStorageService } from './local-storage';
import type { NostrProfileService } from './nostr-profile';

const STORAGE_KEY = 'nostr.settings';

type LocalStorageNostrSettings = Omit<NostrSettingsState, 'privateKey' | 'bunkerSecret'> & {
  privateKey?: object;
  bunkerSecret?: object;
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
    const saved = this._getNostrSettingsFromLocalStorage();

    if (!saved) {
      return;
    }

    this._store.loadState(saved);
  }

  private _getNostrSettingsState(): NostrSettingsState{
    return {
      privateKey: this._store.getPrivateKey(),
      publicKeyHex: this._store.getPublicKeyHex(),
      bunkerUrl: this._store.getBunkerUrl(),
      bunkerSecret: this._store.getBunkerSecret(),
      connectMode: this._store.getConnectMode(),
      profile: this._store.getNostrProfile(),
      nostrProfileUrl: this._store.getNostrProfileUrl(),
      nostrSearchUrl: this._store.getNostrSearchUrl(),
      nostrEventUrl: this._store.getNostrEventUrl(),
    };
  }

  /**
   * Set the private key hex string to the store and local storage
   */
  async setPrivateKey(privateKey: Uint8Array | null) {
    const publicKeyHex = privateKey 
      ? getPublicKey(privateKey) 
      : null;
      
    this._store.setPrivateKey(privateKey);
    this._store.setPublicKeyHex(publicKeyHex);
    this._store.setConnectMode('nsec');
    
    // Trigger profile loading when private key is set
    if (publicKeyHex) {
      this._nostrProfileService.loadProfile(publicKeyHex, false);
    } else {
      this._nostrProfileService.clearProfile();
    }
    
    this._saveNostrSettingsToLocalStorage(this._getNostrSettingsState());
  }

  /**
   * Set the bunker URL
   */
  async setBunkerUrl(bunkerUrl: string | null) {
    // If bunker URL is null, we need to clear the bunker URL and secret key
    // and set back to nostr-connect mode if private key exists
    if (!bunkerUrl) {
      if (this._store.connectMode === 'bunker') {
        // set connect mode
        if (this._store.privateKey) {
          // If private key exists, set back to nsec mode
          this._store.setConnectMode('nsec');
        } else {
          // If private key does not exist, set back to nostr-connect mode
          this._store.setConnectMode('nostr-connect');

          // clear private key
          this._store.setPrivateKey(null);
        }
      }

      // clear bunker secret and url
      this._store.setBunkerSecret(null);
      this._store.setBunkerUrl(null);
      
      this._nostrProfileService.clearProfile();

      this._saveNostrSettingsToLocalStorage(this._getNostrSettingsState());

      return;
    }

    const pointer = await parseBunkerInput(bunkerUrl);

    if (!pointer) {
      return;
    }

    const secret = this._store.bunkerSecret ?? generateSecretKey();
    const bunkerSigner = new BunkerSigner(secret, pointer);

    try {
      await bunkerSigner.connect();
    } catch (err) {
      if (err !== "already connected") {
        throw err;
      }
    }

    const publicKeyHex = await bunkerSigner.getPublicKey();
    
    this._store.setPublicKeyHex(publicKeyHex);
    this._store.setBunkerSecret(secret);
    this._store.setBunkerUrl(bunkerUrl);
    this._store.setConnectMode('bunker');
    
    this._nostrProfileService.loadProfile(publicKeyHex, false);
    
    this._saveNostrSettingsToLocalStorage(this._getNostrSettingsState());
  }

  /**
   * Clear the private key and bunker URL
   */
  clearPrivateKeyAndBunkerUrl() {
    this.setPrivateKey(null);
    this.setBunkerUrl(null);
  }

  private _getNostrSettingsFromLocalStorage(): NostrSettingsState | null {
    const savedString = this._storage.getItem(STORAGE_KEY);

    if (savedString) {
      try {
        const saved = JSON.parse(savedString) as LocalStorageNostrSettings;

        return {
          ...saved,
          privateKey: saved.privateKey 
            ? new Uint8Array(Object.values(saved.privateKey)) 
            : null,
          bunkerSecret: saved.bunkerSecret 
            ? new Uint8Array(Object.values(saved.bunkerSecret)) 
            : null,
        };
      } catch {
        throw new Error('Failed to load nostr settings from localStorage');
      }
    } else {
      return null;
    }
  }

  private _saveNostrSettingsToLocalStorage(settings: NostrSettingsState) {
    try {
      this._storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // throw a new error not to leak any information
      throw new Error('Failed to save nostr settings to localStorage');
    }
  }
}
