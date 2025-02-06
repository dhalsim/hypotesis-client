import { finalizeEvent, SimplePool, type VerifiedEvent } from 'nostr-tools';

import type { Annotation, SavedAnnotation } from "../../types/api";
import type { SidebarStore } from '../store';

import { generateHexString } from '../../shared/random';
import { nostrEventUrl } from '../helpers/nostr';
import type { NostrRelaysService } from './nostr-relays';
import type { NostrHighlightAdapterService } from './nostr-highlight-adapter';
import type { SidebarSettings } from '../../types/config';

export type HighlightsFetchOptions = {
  uri: string;

  /**
   * Optional error handler for SearchClient. Default error handling logs errors
   * to console.
   */
  onError?: (error: Error) => void;
};

export type ThreadFetchOptions = {
  referenceEventId: string;
  
  /**
   * Optional error handler for SearchClient. Default error handling logs errors
   * to console.
   */
  onError?: (error: Error) => void;
};

type PublishReplyOptions = {
  parentAnnotation: SavedAnnotation;
  tags: string[];
  text: string;
};

/**
 * @inject
 */
export class NostrPublisherService {
  private _settings: SidebarSettings;
  private _nostrRelaysService: NostrRelaysService;
  private _nostrHighlightAdapterService: NostrHighlightAdapterService;
  private _store: SidebarStore;

  constructor(
    settings: SidebarSettings,
    nostrRelaysService: NostrRelaysService,
    nostrHighlightAdapterService: NostrHighlightAdapterService,
    store: SidebarStore
  ) {
    this._settings = settings;
    this._nostrRelaysService = nostrRelaysService;
    this._nostrHighlightAdapterService = nostrHighlightAdapterService;
    this._store = store;
  }

  async publishAnnotation(annotation: Annotation): Promise<SavedAnnotation> {
    const event = await this._nostrHighlightAdapterService.convertToEvent(annotation);
    
    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = new SimplePool();

    const connectMode = this._store.getConnectMode();

    let finalizedEvent: VerifiedEvent;

    if (connectMode === 'nsec') {
      const secretKey = this._store.getPrivateKey();
  
      if (!secretKey) {
        throw new Error('No private key found');
      }
  
      finalizedEvent = finalizeEvent(event, secretKey);
    } else {
      throw new Error('Not implemented');
    }

    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), finalizedEvent)
    );

    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Failed to publish annotation');
    }

    return {
      ...annotation,
      nostr_event: finalizedEvent,
      id: finalizedEvent.id,
    }
  }

  async publishReply({ 
    parentAnnotation, 
    tags,
    text
  }: PublishReplyOptions): Promise<SavedAnnotation> {
    const event = await this._nostrHighlightAdapterService.convertToReplyEvent({
      parentAnnotation,
      tags,
      text
    });

    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = new SimplePool();

    const connectMode = this._store.getConnectMode();

    let finalizedEvent: VerifiedEvent;

    if (connectMode === 'nsec') {
      const secretKey = this._store.getPrivateKey();
  
      if (!secretKey) {
        throw new Error('No private key found');
      }
  
      finalizedEvent = finalizeEvent(event, secretKey);
    } else {
      throw new Error('Not implemented');
    }
    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), finalizedEvent)
    );

    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Failed to publish annotation');
    }

    const profile = await this._store.getNostrProfile();

    if (!profile) {
      throw new Error('No profile found');
    }

    return {
      $highlight: false,
      $cluster: 'user-annotations',
      $tag: 'a:' + generateHexString(8),

      id: finalizedEvent.id,
      created: new Date(event.created_at * 1000).toISOString(),
      updated: new Date(event.created_at * 1000).toISOString(),
      document: {
        title: parentAnnotation.document.title,
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ 
          settings: this._settings, 
          store: this._store, 
          event: finalizedEvent, 
          relays: relays.map(r => r.url)
        })
      },
      // TODO: nostr: check Reports
      flagged: false,
      user: finalizedEvent.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags,
      text,
      uri: parentAnnotation.uri,
      permissions: {
        read: ['group:__world__'],
        update: [],
        delete: [],
      },
      target: [
        {
          source: parentAnnotation.uri
        },
      ],
      references: [...(parentAnnotation.references || []), parentAnnotation.id],
      nostr_event: finalizedEvent,
    };
  }
}
