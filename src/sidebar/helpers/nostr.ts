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
