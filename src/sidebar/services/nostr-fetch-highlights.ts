import { SimplePool, kinds } from 'nostr-tools';
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
export class NostrFetchHighlightsService {
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

  async loadByUri({
    uri,
    onError
  }: HighlightsFetchOptions) {
    const store = this._store;

    store.annotationFetchStarted();

    const adapter = this._nostrHighlightAdapterService;
    const relays = this._nostrRelaysService.getReadRelays();
    const pool = new SimplePool();
    const threadLoader = this.loadThread.bind(this);

    pool.trackRelays = true;

    this._subCloser = pool.subscribeMany(
      relays.map((relay) => relay.url),
      [
        {
          kinds: [kinds.Highlights],
          ['#r']: [uri]
        }
      ],
      {
        onclose(reasons) {
          onError?.(new Error(reasons.join('. ')))
        },
        async onevent(evt) {
          const relays = Array.from(pool.seenOn.get(evt.id) ?? [])
            .map((ar) => ar.url);

          const annotation = await adapter.convertToAnnotation({ 
            event: evt, 
            uri, 
            relays 
          });
          
          store.addAnnotations([annotation] as Annotation[]);

          // load threads
          threadLoader({ 
            referenceEventId: evt.id, 
            onError 
          });
        },
        oneose() {
          store.annotationFetchFinished();
        },
      }
    );
  }

  loadThread({ 
    referenceEventId,
    onError 
  }: ThreadFetchOptions) {
    const store = this._store;
    const adapter = this._nostrHighlightAdapterService;
    const relays = this._nostrRelaysService.getReadRelays();
    const pool = new SimplePool();

    store.annotationFetchStarted();

    this._subCloser = pool.subscribeMany(
      relays.map((relay) => relay.url),
      [
        {
          kinds: [1111],
          ['#E']: [referenceEventId]
        }
      ],
      {
        onclose(reasons) {
          onError?.(new Error(reasons.join('. ')))
        },
        async onevent(evt) {
          const relays = Array.from(pool.seenOn.get(evt.id) ?? [])
            .map((ar) => ar.url);

          const annotation = await adapter.convertThread({ 
            threadEvent: evt, 
            annotationId: referenceEventId, 
            relays 
          });

          if (annotation) {
            store.addAnnotations([annotation] as Annotation[]);
          }
        },
        oneose() {
          store.annotationFetchFinished();
        },
      }
    );
  }

  close(): boolean {
    if (this._subCloser) {
      this._subCloser.close();

      return true;
    }

    return false;
  }
}
