import { kinds } from "nostr-tools";
import type { EventTemplate, NostrEvent } from "nostr-tools";

import { generateHexString } from '../../shared/random';
import type { Annotation, SavedAnnotation } from "../../types/api";

import { getHashtags, nostrEventUrl, retryWithBackoff } from "../helpers/nostr";
import type { SidebarStore } from "../store";
import type { SidebarSettings } from "../../types/config";
import type { NostrProfileService } from "./nostr-profile";

type ConvertThreadOptions = {
  event: NostrEvent;
  relays: string[];
};

type ConvertToReplyEventOptions = {
  annotation: Annotation;
  parentAnnotation: SavedAnnotation;
};

type MergeReferencesOptions = {
  rootAnnotation: SavedAnnotation;
  event: NostrEvent;
};

/**
 * @inject
 */
export class NostrThreadAdapterService {
  private _nostrProfileService: NostrProfileService;
  private _settings: SidebarSettings;
  private _store: SidebarStore;
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

  async convertToReplyEvent({
    annotation,
    parentAnnotation,
  }: ConvertToReplyEventOptions): Promise<EventTemplate> {
    const parentAnnotationId = parentAnnotation.id;

    if (!parentAnnotationId) {
      throw new Error('Parent annotation does not have an id');
    }

    const rootAnnotationId = parentAnnotation.references?.[0];
    const parentEvent = parentAnnotation.nostr_event;

    let rootTags: string[][] = [];
    let parentTags: string[][] = [];

    if (rootAnnotationId) {
      const rootAnnotation = await retryWithBackoff(
        async (retryCount: number, maxRetries: number) => {
          const rootAnnotation = this._store.findAnnotationByID(rootAnnotationId);
          
          if (!rootAnnotation) {
            // eslint-disable-next-line no-console
            console.info(`
              No root annotation found for event: ${parentAnnotationId}, 
              rootAnnotationId: ${rootAnnotationId}, 
              attempt ${retryCount + 1}/${maxRetries}
            `);
            
            throw new Error('Root annotation not found');
          }
      
          return rootAnnotation;
        }
      );

      if (!rootAnnotation) {
        throw new Error('Root annotation not found or missing Nostr event');
      }

      const rootEvent = rootAnnotation.nostr_event;

      if (rootEvent.kind !== kinds.Highlights) {
        throw new Error('Root annotation is not a highlight');
      }
      
      rootTags = [
        ["E", rootAnnotationId],
        ["K", rootEvent.kind.toString()],
        ["P", rootAnnotation.user],
      ];

      if (parentEvent.kind !== 1111) {
        throw new Error('Parent annotation is not a reply');
      }

      parentTags = [
        ["e", parentAnnotationId],
        ["k", parentEvent.kind.toString()],
        ["p", parentAnnotation.user],
      ];
    } else {
      // parentAnnotation is the root annotation
      if (parentEvent.kind !== kinds.Highlights) {
        throw new Error('Parent annotation is not a highlight');
      }

      rootTags = [
        ["E", parentAnnotationId],
        ["K", parentEvent.kind.toString()],
        ["P", parentAnnotation.user],
      ];

      parentTags = [
        ["e", parentAnnotationId],
        ["k", parentEvent.kind.toString()],
        ["p", parentAnnotation.user],
      ];
    }

    return {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content: annotation.text,
      tags: [
        ...annotation.tags.map(tag => ['t', tag]),
        ...rootTags,
        ...parentTags,
      ],
    };
  }

  async convertToAnnotation({ 
    event, 
    relays 
  }: ConvertThreadOptions): Promise<SavedAnnotation | null> {
    const rootEventId = event.tags.find(tag => tag[0] === 'E')?.[1];
    
    if (!rootEventId) {
      return null;
    }

    const rootAnnotation = this._store.findAnnotationByID(rootEventId);
    
    if (!rootAnnotation) {
      console.warn(
        `No root annotation found for event: ${event.id}, 
        rootEventId: ${rootEventId}`
      );
      
      return null;
    }
    
    const profile = await this._nostrProfileService.fetchProfile(event.pubkey);
    const createdAt = new Date(event.created_at * 1000).toISOString();
    const references = await this._mergeReferences({ rootAnnotation, event });
    const isCurrentUser = event.pubkey === this._currentUserId;

    return {
      $highlight: false,
      $cluster: isCurrentUser ? 'user-annotations' : 'other-content',
      $tag: 'a:' + generateHexString(8),

      id: event.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title: rootAnnotation.document.title,
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
      flagged: false,
      user: event.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags: getHashtags(event),
      text: event.content,
      uri: rootAnnotation.uri,
      permissions: {
        read: ['group:__world__'],
        update: [],
        delete: [],
      },
      target: [
        {
          source: rootAnnotation.uri
        },
      ],
      references,
      nostr_event: event,
    };
  }

  private async _mergeReferences({ 
    rootAnnotation, 
    event 
  }: MergeReferencesOptions): Promise<string[]> {
    const rootReferenceId = event.tags.find(tag => tag[0] === 'E')?.[1];

    if (rootReferenceId !== rootAnnotation.id) {
      throw new Error('Root reference ID does not match root annotation ID');
    }
    
    const parentAnnotationId = event.tags.find(tag => tag[0] === 'e')?.[1];
    
    if (!parentAnnotationId) {
      return [rootReferenceId];
    }
    
    const parentAnnotation = await retryWithBackoff(
      async (retryCount: number, maxRetries: number) => {
        const parentAnnotation = this._store.findAnnotationByID(parentAnnotationId);
        
        if (!parentAnnotation) {
          // eslint-disable-next-line no-console
          console.info(`
            No thread annotation found for event: ${event.id}, 
            threadReferenceId: ${parentAnnotationId},
            attempt ${retryCount + 1}/${maxRetries}
          `);
          
          throw new Error('Thread annotation not found');
        }
        
        return parentAnnotation;
      }
    );

    if (!parentAnnotation) {
      throw new Error('Failed to fetch thread annotation after all retries');
    }

    return [
      ...(parentAnnotation.references || []),
      parentAnnotationId
    ];
  }
}
