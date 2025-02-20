import type { SubCloser } from "nostr-tools/abstract-pool";

import type { SidebarStore } from "../store";

import { normalizeUrl } from "../helpers/nostr";
import type { NostrRelaysService } from "./nostr-relays";
import type { NostrPageNotesAdapterService } from "./nostr-page-comments-adapter";

type PageNotesFetchOptions = {
  uri: string;
  onError?: (error: Error) => void;
};

/**
 * @inject
 */
export class NostrPageNotesFetcherService {
  private _nostrRelaysService: NostrRelaysService;
  private _nostrPageNotesAdapterService: NostrPageNotesAdapterService;
  private _store: SidebarStore;
  private _subCloser: SubCloser | null = null;

  constructor(
    nostrRelaysService: NostrRelaysService,
    nostrPageNotesAdapterService: NostrPageNotesAdapterService,
    store: SidebarStore
  ) {
    this._nostrRelaysService = nostrRelaysService;
    this._nostrPageNotesAdapterService = nostrPageNotesAdapterService;
    this._store = store;
  }

  loadPageNotes({
    uri,
    onError
  }: PageNotesFetchOptions) {
    const store = this._store;
    const adapter = this._nostrPageNotesAdapterService;
    const relays = this._nostrRelaysService.getReadRelays();
    const pool = this._nostrRelaysService.getPool();
    
    store.annotationFetchStarted();

    const [normalizedUri,] = normalizeUrl(uri);

    this._subCloser = pool.subscribeMany(
      relays,
      [
        {
          kinds: [1111],
          ['#I']: [normalizedUri]
        }
      ],
      {
        onclose(reasons) {
          onError?.(new Error(reasons.join('. ')))
        },
        async onevent(event) {
          const relays = Array.from(pool.seenOn.get(event.id) ?? [])
            .map((ar) => ar.url);
            
          const pageNote = await adapter.convertToPageNotes({ 
            event, 
            uri,
            relays 
          });
          
          if (pageNote) {
            store.addAnnotations([pageNote]);
          }
        },
        oneose() {
          store.annotationFetchFinished();
        },
      }
    );
  }
}
    