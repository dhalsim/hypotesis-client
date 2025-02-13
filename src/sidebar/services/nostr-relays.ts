import { SimplePool } from 'nostr-tools';

import type { SidebarStore } from '../store';

import type { LocalStorageService } from './local-storage';

type RelaySettings = {
  isEnabled: boolean;
  forWrite: boolean;
  forRead: boolean;
}

type RelayMap = {
  [key: string]: RelaySettings;
}

type InsertOrUpdateLocalRelayOptions = {
  pubkey: string;
  relay: string;
  isEnabled: boolean;
  forWrite: boolean;
  forRead: boolean;
}

/**
 * @inject
 */
export class NostrRelaysService {
  private _localRelayMap: RelayMap;
  private _remoteRelayMap: RelayMap;
  private _store: SidebarStore;
  private _localStorage: LocalStorageService;
  private _pool: SimplePool;

  constructor(localStorage: LocalStorageService, store: SidebarStore) {
    this._store = store;
    this._pool = new SimplePool();
    this._pool.trackRelays = true;
    this._localStorage = localStorage;

    const isNostrLoggedIn = this._store.isNostrLoggedIn;

    const hardCodedRelayMap: RelayMap = {
      'wss://purplepag.es/': {
        isEnabled: true,
        forWrite: false,
        forRead: true,
      },
      'wss://relay.nostr.band/all': {
        isEnabled: true,
        forWrite: false,
        forRead: true,
      },
    };

    if (process.env.NODE_ENV !== 'production') {
      hardCodedRelayMap['ws://localhost:10547'] = {
        isEnabled: true,
        forWrite: false,
        forRead: true,
      };
    }

    if (!isNostrLoggedIn) {
      this._localRelayMap = hardCodedRelayMap;
      this._remoteRelayMap = {};

      return;
    }
    
    const pubkey = this._store.getNostrProfile()?.publicKeyHex;

    if (!pubkey) {
      this._localRelayMap = hardCodedRelayMap;
      this._remoteRelayMap = {};

      return;
    }

    const localRelaysKey = `nostr.local.relays-${pubkey}`;
    const remoteRelaysKey = `nostr.remote.relays-${pubkey}`;

    const localRelays = this._localStorage.getItem(localRelaysKey);
    const remoteRelays = this._localStorage.getItem(remoteRelaysKey);

    if (localRelays) {
      this._localRelayMap = JSON.parse(localRelays);
    } else {
      this._localRelayMap = hardCodedRelayMap;
    }

    if (remoteRelays) {
      this._remoteRelayMap = JSON.parse(remoteRelays);
    } else {
      this._remoteRelayMap = {};
    }
  }

  /**
   * Get the nostr pool.
   */
  getPool() {
    return this._pool;
  }

  /**
   * Get the read relays that the user has configured. When we need to fetch
   * data from the nostr network, we use these relays.
   */
  getReadRelays(): string[] {
    return [
      ...new Set([
        ...Object.entries(this._localRelayMap)
          .filter(([, relaySettings]) => { 
            return relaySettings.isEnabled && relaySettings.forRead;
          }).map(([relay]) => relay),
        ...Object.entries(this._remoteRelayMap)
          .filter(([, relaySettings]) => { 
            return relaySettings.isEnabled && relaySettings.forRead;
          }).map(([relay]) => relay),
      ])
    ];
  }

  /**
   * Get the write relays that the user has configured. When we need to send
   * data to the nostr network, we use these relays. Also if we want to fetch
   * user specific events, we can use there these relays.
   */
  getWriteRelays(): string[] {
    return [
      ...new Set([
        ...Object.entries(this._localRelayMap)
          .filter(([, relaySettings]) => { 
            return relaySettings.isEnabled && relaySettings.forWrite;
          }).map(([relay]) => relay),
        ...Object.entries(this._remoteRelayMap)
          .filter(([, relaySettings]) => { 
            return relaySettings.isEnabled && relaySettings.forWrite;
          }).map(([relay]) => relay),
      ])
    ];
  }

  insertOrUpdateLocalRelay({
    pubkey,
    relay,
    isEnabled,
    forWrite,
    forRead,
  }: InsertOrUpdateLocalRelayOptions) {
    this._localRelayMap[relay] = {
      isEnabled,
      forWrite,
      forRead,
    };

    this._localStorage.setItem(
      `nostr.local.relays-${pubkey}`,
      JSON.stringify(this._localRelayMap)
    );
  }

  getLocalRelays() {
    return this._localRelayMap;
  }

  // TODO: nostr: not sure
  updateLocalRelays(relays: RelayMap) {
    const pubkey = this._store.getNostrProfile()?.publicKeyHex;
    
    if (!pubkey) {
      throw new Error('No pubkey found');
    }

    this._localRelayMap = relays;
    this._localStorage.setItem(
      `nostr.local.relays-${pubkey}`,
      JSON.stringify(this._localRelayMap)
    );

    // Update the store
    Object.entries(relays).forEach(([relay, settings]) => {
      this._store.setLocalRelay({ relay, settings });
    });
  }
}
