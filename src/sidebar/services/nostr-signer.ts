import { 
  finalizeEvent, 
  type VerifiedEvent, 
  type EventTemplate 
} from "nostr-tools";
import { 
  BunkerSigner, 
  parseBunkerInput 
} from "nostr-tools/nip46";

import type { SidebarStore } from "../store";

/**
 * @inject
 */
export class NostrSignerService {
  private _store: SidebarStore;

  constructor(store: SidebarStore) {
    this._store = store;
  }

  async signEvent(event: EventTemplate): Promise<VerifiedEvent> {
    const connectMode = this._store.getConnectMode();

    if (connectMode === 'nsec') {
      const secretKey = this._store.getPrivateKey();

      if (!secretKey) {
        throw new Error('No private key found');
      }

      return finalizeEvent(event, secretKey);
    } else if (connectMode === 'bunker') {
      const bunkerUrl = this._store.getBunkerUrl();
      const secret = this._store.getBunkerSecret();

      if (!bunkerUrl) {
        throw new Error('No bunker URL found');
      }

      if (!secret) {
        throw new Error('No bunker secret found');
      }

      const pointer = await parseBunkerInput(bunkerUrl);

      if (!pointer) {
        throw new Error('Invalid bunker URL');
      }

      const signer = new BunkerSigner(secret, pointer);
      
      try {
        await signer.connect();
      } catch (err) {
        if (err !== "already connected") {
          throw err;
        }
      }

      const unsignedEvent = {
        ...event,
        pubkey: await signer.getPublicKey(),
      }


      return signer.signEvent(unsignedEvent);
    }

    throw new Error('Not implemented');
  }
}
