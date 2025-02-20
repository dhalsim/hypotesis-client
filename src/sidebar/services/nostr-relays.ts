import { SimplePool } from 'nostr-tools';

import type { SidebarStore } from '../store';

type RelayProps = {
  write: boolean;
  read: boolean;
}

type RelayMap = {
  [key: string]: RelayProps;
}

type Nip65CacheEntry = {
  relayMap: RelayMap;
  timestamp: number;
}

/**
 * @inject
 */
export class NostrRelaysService {
  private _relayMap: RelayMap;
  private _store: SidebarStore;
  private _pool: SimplePool;
  private _nip65Cache: Map<string, Nip65CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(store: SidebarStore) {
    this._store = store;
    this._pool = new SimplePool();
    this._pool.trackRelays = true;

    this._relayMap = this._getHardCodedRelays();
  }

  loadHardCodedRelays() {
    this._relayMap = this._getHardCodedRelays();
  }

  async loadNip65Relays() {
    const pubkey = this._store.getNostrProfile()?.publicKeyHex;

    if (!pubkey) {
      return;
    }

    const cacheEntry = this._nip65Cache.get(pubkey);

    // Check cache first, if it exists and is still valid, use it
    if (cacheEntry && Date.now() - cacheEntry.timestamp < this.CACHE_DURATION) {
      this._relayMap = cacheEntry.relayMap;
      
      return;
    }

    const nip65Event = await this._pool.get(
      [...this.getWriteRelays(), ...this.getReadRelays()],
      {
        kinds: [10002],
        authors: [pubkey],
        limit: 1,
      }
    );

    if (!nip65Event) {
      return;
    }

    const relayTags = nip65Event.tags.filter((tag) => tag[0] === "r");

    this._relayMap = relayTags.reduce((acc, tag) => {
      acc[tag[1]] = {
        write: 
          process.env.NODE_ENV === 'production' 
            && (tag[2] ===  "write" || !tag[2]),
        read: tag[2] === "read" || !tag[2],
      };
      
      return acc;
    }, {} as RelayMap);

    if (process.env.NODE_ENV !== 'production') {
      this._relayMap['ws://localhost:10547'] = {
        write: true,
        read: true,
      }
    }

    // Update cache
    this._nip65Cache.set(pubkey, {
      relayMap: this._relayMap,
      timestamp: Date.now(),
    });
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
      ...new Set(
        Object.entries(this._relayMap)
          .filter(([, relaySettings]) => relaySettings.read)
          .map(([relay]) => relay)
      )
    ];
  }

  /**
   * Get the write relays that the user has configured. When we need to send
   * data to the nostr network, we use these relays. Also if we want to fetch
   * user specific events, we can use there these relays.
   */
  getWriteRelays(): string[] {
    return [
      ...new Set(
        Object.entries(this._relayMap)
          .filter(([, relaySettings]) => relaySettings.write)
          .map(([relay]) => relay)
      )
    ];
  }

    private _getHardCodedRelays() {
    const productionRelayMap: RelayMap = {
      'wss://purplepag.es/': {
        write: true,
        read: true,
      },
      'wss://relay.nostr.band/all': {
        write: true,
        read: true,
      },
    };

    const developmentRelayMap: RelayMap = {
      'wss://purplepag.es/': {
        write: false,
        read: true,
      },
      'wss://relay.nostr.band/all': {
        write: false,
        read: true,
      },
      'ws://localhost:10547': {
        write: true,
        read: true,
      }
    };

    return process.env.NODE_ENV === 'production' 
      ? productionRelayMap
      : developmentRelayMap;
  }
}
