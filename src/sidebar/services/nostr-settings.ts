import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { generateSecretKey, getPublicKey } from 'nostr-tools';
import {
  BunkerSigner,
  parseBunkerInput,
} from 'nostr-tools/nip46'

import type { SidebarStore } from '../store';
import type { NostrState as NostrSettingsState } from '../store/modules/nostr';
import type { LocalStorageService } from './local-storage';
import type { NostrProfileService } from './nostr-profile';

const STORAGE_KEY = 'nostr.settings';

type NostrSettingsLocalStorage = Omit<NostrSettingsState, 'privateKey' | 'bunkerSecret'> & {
  privateKeyHex: string | null;
  bunkerSecretHex: string | null;
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

    this._store.loadState({
      ...saved,
      privateKey: saved.privateKeyHex 
        ? hexToBytes(saved.privateKeyHex) 
        : null,
      bunkerSecret: saved.bunkerSecretHex 
        ? hexToBytes(saved.bunkerSecretHex) 
        : null,
    });
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
   * Get the current private key hex string
   */
  getPrivateKeyHex(): string | null {
    const saved = this._getNostrSettingsFromLocalStorage();

    if (!saved) {
      return null;
    }

    return saved.privateKeyHex ?? null;
  }

  /**
   * Set the private key hex string to the store and local storage
   */
  async setPrivateKey(privateKey: Uint8Array | null) {
    const publicKeyHex = privateKey ? getPublicKey(privateKey) : null;
    
    const state = this._getNostrSettingsState();
    const settings = await this._convertStateToLocalStorage(state);

    try {
      this._saveNostrSettingsToLocalStorage(settings);

      this._store.setPrivateKey(privateKey);
      this._store.setPublicKeyHex(publicKeyHex);
      this._store.setConnectMode('nsec');
      
      // Trigger profile loading when private key is set
      if (publicKeyHex) {
        this._nostrProfileService.loadProfile(publicKeyHex, false);
      } else {
        this._nostrProfileService.clearProfile();
      }
    } catch (e) {
      console.error('Failed to save nostr settings to localStorage:', e);
    }
  }

  /**
   * Set the bunker URL
   */
  async setBunkerUrl(bunkerUrl: string | null) {
    const state = this._getNostrSettingsState();

    // If bunker URL is null, we need to clear the bunker URL and secret key
    // and set back to nostr-connect mode if private key exists
    if (!bunkerUrl) {
      if (state.connectMode === 'bunker') {
        // fix connect mode
        if (state.privateKey) {
          // If private key exists, set back to nsec mode
          this._store.setConnectMode('nsec');
          state.connectMode = 'nsec';

          // we want to keep the private key
          this._store.setPrivateKey(state.privateKey);
        } else {
          // If private key does not exist, set back to nostr-connect mode
          this._store.setConnectMode('nostr-connect');
          state.connectMode = 'nostr-connect';

          // clear private key
          this._store.setPrivateKey(null);
        }
      }

      // clear bunker secret and url
      this._store.setBunkerSecret(null);
      this._store.setBunkerUrl(null);
      state.bunkerSecret = null;
      state.bunkerUrl = null;
      
      this._nostrProfileService.clearProfile();

      const settings = await this._convertStateToLocalStorage(state);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bunkerSecret, ...toSave } = state;

      this._saveNostrSettingsToLocalStorage({
        ...settings,
        ...toSave,
      });

      return;
    }

    const pointer = await parseBunkerInput(bunkerUrl);

    if (!pointer) {
      return;
    }

    const secret = state.bunkerSecret ?? generateSecretKey();
    const bunkerSigner = new BunkerSigner(secret, pointer);

    try {
      await bunkerSigner.connect();
    } catch (err) {
      if (err !== "already connected") {
        throw err;
      }
    }

    state.bunkerSecret = secret;
    state.bunkerUrl = bunkerUrl;
    state.connectMode = 'bunker';

    this._store.setBunkerSecret(secret);
    this._store.setBunkerUrl(bunkerUrl);
    this._store.setConnectMode('bunker');

    const publicKeyHex = await bunkerSigner.getPublicKey();

    state.publicKeyHex = publicKeyHex;
    this._store.setPublicKeyHex(publicKeyHex);
    
    this._nostrProfileService.loadProfile(publicKeyHex, false);
    
    this._saveNostrSettingsToLocalStorage({
      ...state,
      privateKeyHex: state.privateKey 
        ? bytesToHex(state.privateKey) : null,
      bunkerSecretHex: bytesToHex(secret),
    });
  }

  /**
   * Clear the private key and bunker URL
   */
  clearPrivateKeyAndBunkerUrl() {
    this.setPrivateKey(null);
    this.setBunkerUrl(null);
  }

  private async _convertStateToLocalStorage(
    state: NostrSettingsState
  ): Promise<NostrSettingsLocalStorage> {
    const { privateKey, bunkerSecret, ...rest } = state;

    return {
      ...rest,
      privateKeyHex: privateKey ? bytesToHex(privateKey) : null,
      bunkerSecretHex: bunkerSecret ? bytesToHex(bunkerSecret) : null,
    }
  }

  private _getNostrSettingsFromLocalStorage(): NostrSettingsLocalStorage | null {
    const savedString = this._storage.getItem(STORAGE_KEY);

    if (savedString) {
      try {
        return JSON.parse(savedString) as NostrSettingsLocalStorage;
      } catch {
        throw new Error('Failed to load nostr settings from localStorage');
      }
    } else {
      return null;
    }
  }

  private _saveNostrSettingsToLocalStorage(settings: NostrSettingsLocalStorage) {
    try {
      this._storage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // throw a new error not to leak any information
      throw new Error('Failed to save nostr settings to localStorage');
    }
  }
}
