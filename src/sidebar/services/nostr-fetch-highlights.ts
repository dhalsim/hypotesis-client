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
    const adapter = this._nostrHighlightAdapterService;
    const relays = this._nostrRelaysService.getReadRelays();
    const pool = new SimplePool();

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
          const relays = Array.from(pool.seenOn.get(evt.id) ?? []).map((ar) => ar.url);

          const annotation = await adapter.convert({ event: evt, uri, relays });
          
          store.addAnnotations([annotation] as Annotation[]);
        },
        oneose() {
          
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
