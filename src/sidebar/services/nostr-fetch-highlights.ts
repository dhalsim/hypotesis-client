import { kinds } from 'nostr-tools';
import type { SubCloser } from 'nostr-tools/lib/types/abstract-pool';

import type { SidebarStore } from '../store';

import type { NostrRelaysService } from './nostr-relays';
import type { NostrHighlightAdapterService } from './nostr-highlight-adapter';
import type { NostrFetchThreadsService } from './nostr-fetch-threads';

type HighlightsFetchOptions = {
  /**
   * The URI of the highlights to fetch
   */
  uri: string;

  /**
   * Optional error handler.
   */
  onError?: (error: Error) => void;
};

/**
 * @inject
 */
export class NostrFetchHighlightsService {
  private _nostrRelaysService: NostrRelaysService;
  private _nostrHighlightAdapterService: NostrHighlightAdapterService;
  private _nostrFetchThreadsService: NostrFetchThreadsService;
  private _store: SidebarStore;
  private _subCloser: SubCloser | null = null;

  constructor(
    nostrRelaysService: NostrRelaysService,
    nostrHighlightAdapterService: NostrHighlightAdapterService,
    nostrFetchThreadsService: NostrFetchThreadsService,
    store: SidebarStore
  ) {
    this._nostrRelaysService = nostrRelaysService;
    this._nostrHighlightAdapterService = nostrHighlightAdapterService;
    this._nostrFetchThreadsService = nostrFetchThreadsService;
    this._store = store;
  }

  async loadByUri({
    uri,
    onError
  }: HighlightsFetchOptions) {
    const store = this._store;

    store.annotationFetchStarted();

    const adapter = this._nostrHighlightAdapterService;
    const adapterConvert = adapter.convertToAnnotation.bind(adapter);

    const threadsFetcher = this._nostrFetchThreadsService;
    const fetchThread = threadsFetcher.loadThread.bind(threadsFetcher);

    const relays = this._nostrRelaysService.getReadRelays();
    const pool = this._nostrRelaysService.getPool();

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
        async onevent(event) {
          const relays = Array.from(pool.seenOn.get(event.id) ?? [])
            .map((ar) => ar.url);

          const annotation = await adapterConvert({ 
            event, 
            uri, 
            relays 
          });
          
          store.addAnnotations([annotation]);

          // Load threads for this highlight
          fetchThread({ 
            rootEventId: event.id, 
            onError 
          });
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
