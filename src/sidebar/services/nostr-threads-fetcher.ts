import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';

import type { SidebarStore } from '../store';

import type { NostrRelaysService } from './nostr-relays';
import type { NostrThreadAdapterService } from './nostr-thread-adapter';

type ThreadFetchOptions = {
  rootEventId: string;

  /**
   * Optional error handler. Default error handling logs errors to console.
   */
  onError?: (error: Error) => void;
};

/**
 * @inject
 */
export class NostrThreadsFetcherService {
  private _nostrRelaysService: NostrRelaysService;
  private _nostrThreadAdapterService: NostrThreadAdapterService;
  private _store: SidebarStore;
  private _subCloser: SubCloser | null = null;

  constructor(
    nostrRelaysService: NostrRelaysService,
    nostrThreadAdapterService: NostrThreadAdapterService,
    store: SidebarStore
  ) {
    this._nostrRelaysService = nostrRelaysService;
    this._nostrThreadAdapterService = nostrThreadAdapterService;
    this._store = store;
  }

  loadThread({ 
    rootEventId,
    onError 
  }: ThreadFetchOptions) {
    const store = this._store;
    const adapter = this._nostrThreadAdapterService;
    const relays = this._nostrRelaysService.getReadRelays();
    const pool = this._nostrRelaysService.getPool();

    store.annotationFetchStarted();

    this._subCloser = pool.subscribeMany(
      relays.map((relay) => relay.url),
      [
        {
          kinds: [1111],
          ['#E']: [rootEventId]
        }
      ],
      {
        onclose(reasons) {
          onError?.(new Error(reasons.join('. ')))
        },
        async onevent(event) {
          const relays = Array.from(pool.seenOn.get(event.id) ?? [])
            .map((ar) => ar.url);

          const annotation = await adapter.convertToAnnotation({ 
            event, 
            relays 
          });

          if (annotation) {
            store.addAnnotations([annotation]);
          }
        },
        oneose() {
          store.annotationFetchFinished();
        },
      }
    );
  }

  // TODO: nostr: this is not used anywhere
  close(): boolean {
    if (this._subCloser) {
      this._subCloser.close();
      
      return true;
    }
    
    return false;
  }
}
