import type { SidebarStore } from '../store';
import type { NostrProfile } from '../store/modules/nostr';

import type { NostrRelaysService } from './nostr-relays';

interface CachedProfile {
  profile: NostrProfile;
  timestamp: number;
}

/**
 * Service for managing Nostr profile loading and caching.
 */
// @inject
export class NostrProfileService {
  private _store: SidebarStore;
  private _nostrRelaysService: NostrRelaysService;
  private _profileCache: Map<string, CachedProfile>;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(store: SidebarStore, nostrRelaysService: NostrRelaysService) {
    this._store = store;
    this._nostrRelaysService = nostrRelaysService;
    this._profileCache = new Map();
  }

  private getCachedProfile(publicKeyHex: string): NostrProfile | null {
    const cached = this._profileCache.get(publicKeyHex);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_DURATION) {
      // Cache expired
      this._profileCache.delete(publicKeyHex);
      
      return null;
    }

    return cached.profile;
  }

  /**
   * Load a Nostr profile for the given public key.
   * This will set the profile loading state and fetch profile data.
   */
  async loadProfile(publicKeyHex: string, useCacheOnRead: boolean = true) {
    try {
      // Set initial loading state
      const initialProfile: NostrProfile = {
        publicKeyHex,
        loading: true,
      };

      this._store.setNostrProfile(initialProfile);

      // Update relays to Nip65 of the user
      await this._nostrRelaysService.loadNip65Relays();

      // Check cache first
      const cachedProfile = useCacheOnRead 
        ? this.getCachedProfile(publicKeyHex) 
        : null;
      
      if (cachedProfile) {
        this._store.setNostrProfile(cachedProfile);
        
        return;
      }

      const profile = await this.fetchProfile(publicKeyHex);
      
      this._profileCache.set(profile.publicKeyHex, {
        profile,
        timestamp: Date.now(),
      });
      
      this._store.setNostrProfile(profile);
    } catch (err) {
      console.error('Failed to load Nostr profile:', err);
      // Clear any existing profile on error
      this._store.setNostrProfile(null);
      // Update relays to hardcoded relays  
      this._nostrRelaysService.loadHardCodedRelays();
    }
  }

  async fetchProfile(publicKeyHex: string): Promise<NostrProfile> {
    const pool = this._nostrRelaysService.getPool();
    const relays = this._nostrRelaysService.getReadRelays();
    
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
   * Clear the currently loaded profile and its cache entry
   */
  clearProfile() {
    const currentProfile = this._store.getNostrProfile();
    
    if (currentProfile) {
      this._profileCache.delete(currentProfile.publicKeyHex);
    }
    
    this._store.setNostrProfile(null);
  }
}
