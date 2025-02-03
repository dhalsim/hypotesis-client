import type { Event } from "nostr-tools";

import type { NostrProfileService } from "./nostr-profile";

import { nostrEventUrl } from "../helpers/nostr";
import type { APIAnnotationData } from "../../types/api";
import type { SidebarStore } from "../store";
import type { SidebarSettings } from "../../types/config";

type ConvertHighlightOptions = {
  event: Event;
  uri: string;
  relays: string[];
};

/**
 * @inject
 */
export class NostrHighlightAdapterService {
  private _nostrProfileService: NostrProfileService;
  private _settings: SidebarSettings;
  private _store: SidebarStore;

  constructor(
    nostrProfileService: NostrProfileService, 
    settings: SidebarSettings, 
    store: SidebarStore
  ) {
    this._nostrProfileService = nostrProfileService;
    this._settings = settings;
    this._store = store;
  }

  async convert({ event, uri, relays }: ConvertHighlightOptions): Promise<APIAnnotationData> {
    const profile = await this._nostrProfileService.fetchProfile(event.pubkey);

    const createdAt = new Date(event.created_at * 1000).toISOString()

    return {
      id: event.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title: [
          getDocumentTitle(uri)
        ] as unknown as string // wrong type
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ settings: this._settings, store: this._store, event, relays })
      },
      // TODO: check Reports
      flagged: false,
      user: event.pubkey,
      // TODO: Load profile and take the display_name
      user_info: {
        display_name: profile.displayName || null
      },
      // hashtags
      tags: event.tags.filter(tag => tag[0] === 't')
        .map(tag => tag[1] || '')
        .filter(tag => tag !== ''),
      text: '',
      uri,
      permissions: {
        // to make the highlight public
        read: [
          'group:__world__'
        ],
        update: [],
        delete: [],
      },
      target: [
        {
          source: uri,
          // To make it an annotation, we need to have at least one selector
          selector: [
            {
              type: 'TextQuoteSelector',
              exact: event.content,
            },
          ],
        },
      ],
    };
  }
}

// function to get the document title from the uri, we don't have it in the nostr event, so I put the domain as the title
function getDocumentTitle(uri: string) {
  let domain;
  
  try {
    domain = new URL(uri).hostname;
  } catch {
    domain = '';
  }
  
  if (domain === 'localhost') {
    domain = '';
  }

  return domain;
}
