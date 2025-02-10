import { 
  finalizeEvent, 
  type VerifiedEvent, 
  type EventTemplate 
} from "nostr-tools";

import type { SidebarStore } from "../store";

/**
 * @inject
 */
export class NostrSignerService {
  private _store: SidebarStore;

  constructor(store: SidebarStore) {
    this._store = store;
  }

  signEvent(event: EventTemplate): VerifiedEvent {
    const connectMode = this._store.getConnectMode();

    if (connectMode === 'nsec') {
      const secretKey = this._store.getPrivateKey();

      if (!secretKey) {
        throw new Error('No private key found');
      }

      return finalizeEvent(event, secretKey);
    }

    throw new Error('Not implemented');
  }
}
