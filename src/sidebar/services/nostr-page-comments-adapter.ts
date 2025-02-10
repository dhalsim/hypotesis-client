import type { EventTemplate, NostrEvent } from "nostr-tools";

import { generateHexString } from "../../shared/random";
import type { Annotation, SavedAnnotation } from "../../types/api";
import type { SidebarSettings } from "../../types/config";

import { 
  getHashtags, 
  nostrEventUrl, 
  retryWithBackoff, 
  normalizeUrl 
} from "../helpers/nostr";
import type { SidebarStore } from "../store";

import type { NostrProfileService } from "./nostr-profile";

type ConvertPageNoteOptions = {
  event: NostrEvent;
  uri: string;
  relays: string[];
};

type GetParentAnnotationOptions = {
  eventId: string;
  parentAnnotationId: string;
};

type ConvertToReplyEventOptions = {
  annotation: Annotation;
  parentAnnotation: SavedAnnotation;
};

/**
 * @inject
 */
export class NostrPageNotesAdapterService {
  private _store: SidebarStore;
  private _nostrProfileService: NostrProfileService;
  private _settings: SidebarSettings;
  private _currentUserId: string | null;

  constructor(
    nostrProfileService: NostrProfileService,
    settings: SidebarSettings,
    store: SidebarStore
  ) {
    this._nostrProfileService = nostrProfileService;
    this._settings = settings;
    this._store = store;
    this._currentUserId = store.getPublicKeyHex();
  }

  /**
   * Convert a Nostr event to a page note.
   * 
   * @param event - The Nostr event to convert. It doesn't have any selectors.
   * @param relays - The relays to use to fetch the event.
   * @returns The converted page note.
   */
  async convertToPageNotes({
    event,
    uri,
    relays
  }: ConvertPageNoteOptions): Promise<SavedAnnotation | null> {    
    const parentAnnotationId = event.tags.find(tag => tag[0] === 'e')?.[1];

    // If there's a parentAnnotationId, try to fetch the parent annotation
    const parentAnnotation = parentAnnotationId 
      ? await this._getParentAnnotation({ eventId: event.id, parentAnnotationId })
      : null;

    // If we failed to fetch a required parent annotation, return null
    if (parentAnnotationId && !parentAnnotation) {
      return null;
    }

    const title = parentAnnotation
      ? parentAnnotation.document.title
      : event.tags.find(tag => tag[0] === 'document_title')?.[1] || '';

    const references = parentAnnotation
      ? (parentAnnotation.references || []).concat([parentAnnotation.id])
      : undefined;

    const profile = await this._nostrProfileService.fetchProfile(event.pubkey);
    const createdAt = new Date(event.created_at * 1000).toISOString();
    const isCurrentUser = event.pubkey === this._currentUserId;

    return {
      $highlight: false,
      $cluster: isCurrentUser ? 'user-annotations' : 'other-content',
      $tag: 'a:' + generateHexString(8),

      id: event.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ 
          settings: this._settings, 
          store: this._store, 
          event, 
          relays 
        })
      },
      // TODO: nostr: check for reports
      flagged: false,
      user: event.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags: getHashtags(event),
      text: event.content,
      uri,
      permissions: {
        read: ['group:__world__'],
        update: [],
        delete: [],
      },
      target: [
        {
          source: uri
        },
      ],
      references,
      nostr_event: event,
    };
  }

  convertToReplyEvent({ 
    annotation, 
    parentAnnotation 
  }: ConvertToReplyEventOptions): EventTemplate {
    const [normalizedUri, normalizedProtocol] = normalizeUrl(annotation.uri);

    const rootTags = [
      ["I", normalizedUri],
      ["K", normalizedProtocol],
    ];

    const parentTags = [
      ["e", parentAnnotation.id],
      ["k", "1111"],
      ["p", parentAnnotation.user],
    ];

    return {
      kind: 1111,
      created_at: Math.floor(new Date(annotation.created).getTime() / 1000),
      content: annotation.text,
      tags: [
        ...rootTags,
        ...parentTags,
        ...annotation.tags.map(tag => ["t", tag.toString()]),
      ],
    };
  }

  convertToEvent(annotation: Annotation): EventTemplate {
    const [normalizedUri, normalizedProtocol] = normalizeUrl(annotation.uri);

    const rootTags = [
      ["I", normalizedUri],
      ["K", normalizedProtocol],
    ];

    const parentTags = [
      ["i", normalizedUri],
      ["k", normalizedProtocol],
    ];

    return {
      kind: 1111,
      created_at: Math.floor(new Date(annotation.created).getTime() / 1000),
      content: annotation.text,
      tags: [
        ...rootTags,
        ...parentTags,
        ...annotation.tags.map(tag => ["t", tag.toString()]),
      ],
    };
  }

  private async _getParentAnnotation({
    eventId, 
    parentAnnotationId
  }: GetParentAnnotationOptions): Promise<SavedAnnotation | null> {
    const parentAnnotation = await retryWithBackoff(
      async (retryCount: number, maxRetries: number) => {
        const parentAnnotation = this._store.findAnnotationByID(parentAnnotationId);
        
        if (!parentAnnotation) {
          // eslint-disable-next-line no-console
          console.info(`
            No parent annotation found for event: ${eventId}, 
            parentAnnotationId: ${parentAnnotationId}, 
            attempt ${retryCount + 1}/${maxRetries}
          `);
          
          throw new Error('Parent annotation not found');
        }
        
        return parentAnnotation;
      }
    );
    
    if (!parentAnnotation) {
      console.warn(`
        No parent annotation found for event: ${eventId}, 
        parentAnnotationId: ${parentAnnotationId}
      `);

      return null;
    }

    return parentAnnotation;
  }
}