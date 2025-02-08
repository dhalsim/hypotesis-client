import { nip19 } from "nostr-tools";
import type { Event } from "nostr-tools";

import type { SidebarSettings } from "../../types/config";
import type { SidebarStore } from "../store";

type NostrProfileUrlOptions = {
  settings: SidebarSettings;
  store: SidebarStore;
  pubkey: string;
};

type NostrEventUrlOptions = {
  settings: SidebarSettings;
  store: SidebarStore;
  event: Event;
  relays: string[];
};

type NostrSearchUrlOptions = {
  settings: SidebarSettings;
  store: SidebarStore;
  searchTerm?: string;
  tag?: string;
};

export function nostrProfileUrl({ settings, store, pubkey }: NostrProfileUrlOptions) {
  const baseUrl = store.getNostrProfileUrl() ?? settings.nostrProfileUrl ?? 'https://njump.me';
  const npub = nip19.npubEncode(pubkey);
  
  return `${baseUrl}/${npub}`;
}

export function nostrEventUrl({ settings, store, event, relays }: NostrEventUrlOptions) {
  const baseUrl = store.getNostrEventUrl() ?? settings.nostrEventUrl ?? 'https://njump.me';

  return `${baseUrl}/${nip19.neventEncode({
    id: event.id,
    relays,
    author: event.pubkey,
    kind: event.kind,
  })}`;
}

export function nostrSearchUrl({ settings, store, searchTerm, tag }: NostrSearchUrlOptions) {
  const baseUrl = store.getNostrSearchUrl() 
    ?? settings.nostrSearchUrl 
    ?? 'https://nostr.band/?q=';
  
  const query = searchTerm ? `${searchTerm}++` : '';
  const encodedTag = tag ? encodeURIComponent(`#${tag}`) : '';
  
  return `${baseUrl}${query}${encodedTag}`;
}

export async function retryWithBackoff<T>(
  operation: (retryCount: number) => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 200
): Promise<T> {
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation(retryCount);
    } catch (error) {
      retryCount++;
      
      if (retryCount === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 100ms, 500ms, 2500ms
      const delay = initialDelay * Math.pow(5, retryCount - 1);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries reached');
}

export function nostrDisplayName(
  pubkeyHex: string,
  displayName?: string | null,
  shorten: boolean = true
): string {
  if (displayName) {
    return displayName;
  }

  const npub = nip19.npubEncode(pubkeyHex);

  if (shorten) {
    return npub.slice(0, 5) + ':' + npub.slice(-5);
  }

  return npub;
}
