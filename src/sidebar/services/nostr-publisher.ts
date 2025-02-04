import { finalizeEvent, SimplePool, type VerifiedEvent } from 'nostr-tools';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';

import type { Annotation } from "../../types/api";
import type { SidebarStore } from '../store';

import type { NostrRelaysService } from './nostr-relays';
import type { NostrHighlightAdapterService } from './nostr-highlight-adapter';

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

/**
 * @inject
 */
export class NostrPublisherService {
  private _nostrRelaysService: NostrRelaysService;
  private _nostrHighlightAdapterService: NostrHighlightAdapterService;
  private _store: SidebarStore;
  private _subCloser: SubCloser | null = null;

  constructor(
    nostrRelaysService: NostrRelaysService,
    nostrHighlightAdapterService: NostrHighlightAdapterService,
    store: SidebarStore
  ) {
    this._nostrRelaysService = nostrRelaysService;
    this._nostrHighlightAdapterService = nostrHighlightAdapterService;
    this._store = store;
  }

  async publishAnnotation(annotation: Annotation, tags: string[]) {
    const event = await this._nostrHighlightAdapterService.convertToEvent({
      annotation,
      tags
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
    
    return pool.publish(relays.map(r => r.url), finalizedEvent);
  }

  async publishReply() {
    throw new Error('Not implemented');
  }
}
