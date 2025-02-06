import { SimplePool } from 'nostr-tools';

import type { SidebarStore } from '../store';
import type { NostrProfile } from '../store/modules/nostr';
import type { NostrRelaysService } from './nostr-relays';

/**
 * Service for managing Nostr profile loading and caching.
 */
// @inject
export class NostrProfileService {
  private _store: SidebarStore;
  private _nostrRelaysService: NostrRelaysService;

  constructor(store: SidebarStore, nostrRelaysService: NostrRelaysService) {
    this._store = store;
    this._nostrRelaysService = nostrRelaysService;
  }

  /**
   * Load a Nostr profile for the given private key.
   * This will set the profile loading state and fetch profile data.
   */
  async loadProfile(publicKeyHex: string) {
    try {
      // Set initial loading state
      const initialProfile: NostrProfile = {
        publicKeyHex,
        loading: true,
      };

      this._store.setProfile(initialProfile);

      const profile = await this.fetchProfile(publicKeyHex);

      this._store.setProfile(profile);
    } catch (err) {
      console.error('Failed to load Nostr profile:', err);
      // Clear any existing profile on error
      this._store.setProfile(null);
    }
  }

  async fetchProfile(publicKeyHex: string): Promise<NostrProfile> {
    const pool = new SimplePool();
    const relays = this._nostrRelaysService.getReadRelays().map(
      relay => relay.url
    );
    
    const filter = {
      kinds: [0],
      authors: [publicKeyHex],
      limit: 1,
    };

    const metadataEvent = await pool.get(relays, filter);

    if (!metadataEvent) {
      console.error('metadata filter', filter);
      console.error('metadata relays', relays);

      throw new Error('No metadata event found');
    }

    const metadata = JSON.parse(metadataEvent.content);
    
    return {
      publicKeyHex,
      displayName: metadata.display_name || metadata.name,
      picture: metadata.picture,
      loading: false,
    };
  }

  /**
   * Clear the currently loaded profile
   */
  clearProfile() {
    this._store.setProfile(null);
  }
}
