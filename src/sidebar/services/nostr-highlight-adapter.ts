import type { Event, EventTemplate } from "nostr-tools";
import { kinds } from "nostr-tools";

import type { NostrProfileService } from "./nostr-profile";

import { nostrEventUrl, retryWithBackoff } from "../helpers/nostr";
import type { APIAnnotationData } from "../../types/api";
import type { SidebarStore } from "../store";
import type { SidebarSettings } from "../../types/config";

type ConvertHighlightOptions = {
  event: Event;
  uri: string;
  relays: string[];
};

type ConvertToEventOptions = {
  annotation: APIAnnotationData;
  tags: string[];
};

type ConvertThreadOptions = {
  threadEvent: Event;
  annotationId: string;
  relays: string[];
};

type MergeReferencesOptions = {
  referencedAnnotation: APIAnnotationData;
  event: Event;
};

/**
 * @inject
 */
export class NostrHighlightAdapterService {
  private _nostrProfileService: NostrProfileService;
  private _settings: SidebarSettings;
  private _store: SidebarStore;

  constructor(
    nostrProfileService: NostrProfileService, 
    settings: SidebarSettings, 
    store: SidebarStore
  ) {
    this._nostrProfileService = nostrProfileService;
    this._settings = settings;
    this._store = store;
  }

  async convertToEvent({
    annotation,
    tags
  }: ConvertToEventOptions): Promise<EventTemplate> {
    const selector = annotation.target[0].selector?.find(
      s => s.type === 'TextQuoteSelector'
    );

    if (!selector) {
      throw new Error('No TextQuoteSelector found');
    }
    
    
    return {
      kind: kinds.Highlights,
      created_at: Math.floor(new Date(annotation.created).getTime() / 1000),
      content: selector.exact,
      tags: [["r", annotation.uri]].concat(tags.map(tag => ["t", tag])),
    };
  }

  async convertToAnnotation({ 
    event, 
    uri, 
    relays 
  }: ConvertHighlightOptions): Promise<APIAnnotationData> {
    const profile = await this._nostrProfileService.fetchProfile(event.pubkey);

    const createdAt = new Date(event.created_at * 1000).toISOString()

    return {
      id: event.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title: [
          getDocumentTitle(uri)
        ] as unknown as string // wrong type
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ settings: this._settings, store: this._store, event, relays })
      },
      // TODO: check Reports
      flagged: false,
      user: event.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      // hashtags
      tags: getHashtags(event),
      text: '',
      uri,
      permissions: {
        // to make the highlight public
        read: [
          'group:__world__'
        ],
        update: [],
        delete: [],
      },
      target: [
        {
          source: uri,
          // To make it an annotation, we need to have at least one selector
          selector: [
            {
              type: 'TextQuoteSelector',
              exact: event.content,
            },
          ],
        },
      ],
    };
  }

  async convertThread({ 
    threadEvent, 
    annotationId,
    relays 
  }: ConvertThreadOptions): Promise<APIAnnotationData | null> {
    const referencedAnnotation = await this._store.findAnnotationByID(annotationId);
    
    if (!referencedAnnotation) {
      console.warn(`
        No referenced annotation found for event: ${threadEvent.id}, 
        annotationId: ${annotationId}
      `);

      return null;
    }
    
    const profile = await this._nostrProfileService.fetchProfile(threadEvent.pubkey);

    const createdAt = new Date(threadEvent.created_at * 1000).toISOString()

    const references = await this._mergeReferences({ 
      referencedAnnotation, 
      event: threadEvent 
    });

    return {
      id: threadEvent.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title: referencedAnnotation.document.title,
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ settings: this._settings, store: this._store, event: threadEvent, relays })
      },
      // TODO: check Reports
      flagged: false,
      user: threadEvent.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags: getHashtags(threadEvent),
      text: '',
      uri: referencedAnnotation.uri,
      permissions: {
        read: ['group:__world__'],
        update: [],
        delete: [],
      },
      target: [
        {
          source: referencedAnnotation.uri
        },
      ],
      references,
    };
  }

  /**
   * Merge the references of the root highlight and recursively of all the thread events
   * 
   * @param referencedAnnotation - the root highlight/annotation
   * @param event - the current thread event
   * @returns array of reference IDs in the thread chain
   */
  private async _mergeReferences({ 
    referencedAnnotation, 
    event 
  }: MergeReferencesOptions): Promise<string[]> {
    // Get the reference to the root annotation (uppercase 'E' tag)
    const rootReferenceId = event.tags.find(tag => tag[0] === 'E')?.[1];

    if (rootReferenceId !== referencedAnnotation.id) {
      console.warn(`
        Root reference ID mismatch for event: ${event.id}, 
        expected: ${referencedAnnotation.id}, 
        got: ${rootReferenceId}
      `);
      
      return [];
    }
    
    if (!rootReferenceId) {
      console.warn(`
        No root reference found for event: ${event.id}, 
        referenced annotation: ${referencedAnnotation.id}
      `);
      
      return referencedAnnotation.references || [];
    }
    
    // Get the reference to parent thread event if exists (lowercase 'e' tag)
    const threadReferenceId = event.tags.find(tag => tag[0] === 'e')?.[1];
    
    // If this is a root thread event (only has 'E' tag)
    if (!threadReferenceId) {
      return [rootReferenceId];
    }
    
    // For thread replies, get the parent thread annotation
    const threadAnnotation = await retryWithBackoff(
      async (retryCount: number) => {
        const annotation = await this._store.findAnnotationByID(threadReferenceId);
        
        if (!annotation) {
          console.warn(`
            No thread annotation found for event: ${event.id}, 
            threadReferenceId: ${threadReferenceId},
            attempt ${retryCount + 1}/3
          `);
          
          throw new Error('Thread annotation not found');
        }
        return annotation;
      }
    ).catch(() => null);

    if (!threadAnnotation) {
      console.warn('Failed to fetch thread annotation after all retries');
      
      return [];
    }

    // Build the reference chain:
    // Use parent's references (which include rootReferenceId) and append current threadReferenceId
    return [
      ...(threadAnnotation.references || []),
      threadReferenceId
    ];
  }
}

// function to get the document title from the uri, we don't have it in the nostr event, so I put the domain as the title
function getDocumentTitle(uri: string) {
  let domain;
  
  try {
    domain = new URL(uri).hostname;
  } catch {
    domain = '';
  }
  
  if (domain === 'localhost') {
    domain = '';
  }

  return domain;
}

function getHashtags(event: Event) {
  return event.tags.filter(tag => tag[0] === 't')
    .map(tag => tag[1] || '')
    .filter(tag => tag !== '');
}
