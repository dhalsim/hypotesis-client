import { generateHexString } from '../../shared/random';
import type { Annotation, SavedAnnotation } from "../../types/api";
import type { SidebarSettings } from '../../types/config';

import { nostrEventUrl } from '../helpers/nostr';
import type { SidebarStore } from '../store';

import type { NostrRelaysService } from './nostr-relays';
import type { NostrHighlightAdapterService } from './nostr-highlight-adapter';
import type { NostrThreadAdapterService } from './nostr-thread-adapter';
import type { NostrPageNotesAdapterService } from './nostr-page-comments-adapter';
import type { NostrSignerService } from './nostr-signer';

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
  annotation: Annotation;
  parentAnnotation: SavedAnnotation;
};

/**
 * @inject
 */
export class NostrPublisherService {
  private _settings: SidebarSettings;
  private _nostrRelaysService: NostrRelaysService;
  private _nostrHighlightAdapterService: NostrHighlightAdapterService;
  private _nostrThreadAdapterService: NostrThreadAdapterService;
  private _nostrPageNotesAdapterService: NostrPageNotesAdapterService;
  private _nostrSignerService: NostrSignerService;
  private _store: SidebarStore;

  constructor(
    settings: SidebarSettings,
    nostrRelaysService: NostrRelaysService,
    nostrHighlightAdapterService: NostrHighlightAdapterService,
    nostrThreadAdapterService: NostrThreadAdapterService,
    nostrPageNotesAdapterService: NostrPageNotesAdapterService,
    nostrSignerService: NostrSignerService,
    store: SidebarStore
  ) {
    this._settings = settings;
    this._nostrRelaysService = nostrRelaysService;
    this._nostrHighlightAdapterService = nostrHighlightAdapterService;
    this._nostrThreadAdapterService = nostrThreadAdapterService;
    this._nostrPageNotesAdapterService = nostrPageNotesAdapterService;
    this._nostrSignerService = nostrSignerService;
    this._store = store;
  }

  async publishAnnotation(annotation: Annotation): Promise<SavedAnnotation> {
    const event = this._nostrHighlightAdapterService.convertToEvent(annotation);
    
    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = this._nostrRelaysService.getPool();

    const signedEvent = this._nostrSignerService.signEvent(event);

    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), signedEvent)
    );

    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Failed to publish annotation');
    }

    return {
      ...annotation,
      nostr_event: signedEvent,
      id: signedEvent.id,
    }
  }

  async publishAnnotationReply({ 
    annotation,
    parentAnnotation
  }: PublishReplyOptions): Promise<SavedAnnotation> {
    const event = await this._nostrThreadAdapterService.convertToReplyEvent({
      parentAnnotation,
      annotation,
    });

    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = this._nostrRelaysService.getPool();

    const signedEvent = this._nostrSignerService.signEvent(event);

    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), signedEvent)
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

      id: signedEvent.id,
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
          event: signedEvent, 
          relays: relays.map(r => r.url)
        })
      },
      // TODO: nostr: check Reports
      flagged: false,
      user: signedEvent.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags: annotation.tags,
      text: annotation.text,
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
      nostr_event: signedEvent,
    };
  }

  async publishPageNote(annotation: Annotation): Promise<SavedAnnotation> {
    const event = this._nostrPageNotesAdapterService.convertToEvent(annotation);

    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = this._nostrRelaysService.getPool();

    const signedEvent = this._nostrSignerService.signEvent(event);

    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), signedEvent)
    );

    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Failed to publish page note');
    }

    return {
      ...annotation,
      nostr_event: signedEvent,
      id: signedEvent.id,
    }
  }

  async publishPageNoteReply({
    parentAnnotation,
    annotation
  }: PublishReplyOptions): Promise<SavedAnnotation> {
    const event = this._nostrPageNotesAdapterService.convertToReplyEvent({
      annotation,
      parentAnnotation,
    });

    const relays = this._nostrRelaysService.getWriteRelays();
    const pool = this._nostrRelaysService.getPool();

    const signedEvent = this._nostrSignerService.signEvent(event);

    // check if any relay is successful
    const results = await Promise.allSettled(
      pool.publish(relays.map(r => r.url), signedEvent)
    );

    if (results.every(r => r.status === 'rejected')) {
      throw new Error('Failed to publish page note reply');
    }

    return {
      ...annotation,
      nostr_event: signedEvent,
      id: signedEvent.id,
    }
  }
}
