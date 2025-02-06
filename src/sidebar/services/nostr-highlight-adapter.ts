import type { NostrEvent, EventTemplate } from "nostr-tools";
import { kinds } from "nostr-tools";

import { generateHexString } from '../../shared/random';

import { nostrEventUrl, retryWithBackoff } from "../helpers/nostr";
import type { 
  RangeSelector, 
  Annotation,
  SavedAnnotation, 
  Selector, 
  TextPositionSelector, 
  TextQuoteSelector 
} from "../../types/api";
import type { SidebarStore } from "../store";
import type { SidebarSettings } from "../../types/config";

import type { NostrProfileService } from "./nostr-profile";

type ConvertHighlightOptions = {
  event: NostrEvent;
  uri: string;
  relays: string[];
};

type ConvertToReplyEventOptions = {
  parentAnnotation: SavedAnnotation;
  tags: string[];
  text: string;
};

type ConvertThreadOptions = {
  threadEvent: NostrEvent;
  rootEventId: string;
  relays: string[];
};

type MergeReferencesOptions = {
  rootAnnotation: SavedAnnotation;
  event: NostrEvent;
};

type SupportedSelector = TextQuoteSelector | TextPositionSelector | RangeSelector;

/**
 * @inject
 */
export class NostrHighlightAdapterService {
  private _nostrProfileService: NostrProfileService;
  private _settings: SidebarSettings;
  private _store: SidebarStore;
  private _currentUserId: string | null;

  constructor(
    nostrProfileService: NostrProfileService, 
    settings: SidebarSettings, 
    store: SidebarStore
  ) {
    this._nostrProfileService = nostrProfileService;
    this._settings = settings;
    this._store = store;

    this._currentUserId = store.getPublicKeyHex();
  }

  async convertToEvent(annotation: Annotation): Promise<EventTemplate> {
    if (!annotation.target[0].selector) {
      throw new Error('No selector found');
    }

    const textQuoteSelector = annotation.target[0].selector.find(
      s => s.type === 'TextQuoteSelector'
    );

    if (!textQuoteSelector) {
      throw new Error('No TextQuoteSelector found');
    }

    const selectors = annotation.target[0].selector?.filter(
      s => s.type === 'TextPositionSelector' || 
          s.type === 'RangeSelector'
    );
    
    return {
      kind: kinds.Highlights,
      created_at: Math.floor(new Date(annotation.created).getTime() / 1000),
      content: textQuoteSelector.exact,
      tags: [
        ["r", annotation.uri],
        ...annotation.tags.map(tag => ["t", tag.toString()]),
        ...this.serializeSelectors(textQuoteSelector, selectors),
      ],
    };
  }

  serializeSelectors(textQuoteSelector: TextQuoteSelector, selectors: Selector[]): string[][] {
    const textPositionSelector = selectors.find(
      s => s.type === 'TextPositionSelector'
    );

    const rangeSelector = selectors.find(
      s => s.type === 'RangeSelector'
    );

    return [
      [
        textQuoteSelector.type.toLowerCase(), 
        textQuoteSelector.exact, 
        textQuoteSelector.prefix, 
        textQuoteSelector.suffix
      ].filter(Boolean) as string[],
      textPositionSelector ? [
        textPositionSelector.type.toLowerCase(), 
        textPositionSelector.start.toString(), 
        textPositionSelector.end.toString()
      ] : [],
      rangeSelector ? [
        rangeSelector.type.toLowerCase(), 
        rangeSelector.startContainer, 
        rangeSelector.endContainer, 
        rangeSelector.startOffset.toString(), 
        rangeSelector.endOffset.toString()
      ] : [],
    ];
  }

  async convertToReplyEvent({
    parentAnnotation,
    tags,
    text
  }: ConvertToReplyEventOptions): Promise<EventTemplate> {
    const parentAnnotationId = parentAnnotation.id;

    if (!parentAnnotationId) {
      throw new Error('Parent annotation does not have an id');
    }

    const rootAnnotationId = parentAnnotation.references?.[0];

    const parentEvent = parentAnnotation.nostr_event;

    let rootTags: string[][] = [];
    let parentTags: string[][] = [];

    if (rootAnnotationId) {
      const rootAnnotation = await this._store.findAnnotationByID(rootAnnotationId);
      
      if (!rootAnnotation) {
        throw new Error('No root annotation found');
      }

      if (!rootAnnotation.nostr_event) {
        throw new Error('Root annotation does not have a Nostr event');
      }

      const rootEvent = rootAnnotation.nostr_event;

      if (rootEvent.kind !== kinds.Highlights) {
        throw new Error('Root annotation is not a highlight');
      }
      
      rootTags = [
        ["E", rootAnnotationId],
        ["K", rootEvent.kind.toString()],
        ["P", rootAnnotation.user],
      ];

      if (parentEvent.kind !== 1111) {
        throw new Error('Parent annotation is not a reply');
      }

      parentTags = [
        ["e", parentAnnotationId],
        ["k", parentEvent.kind.toString()],
        ["p", parentAnnotation.user],
      ];
    } else {
      // parentAnnotation is the root annotation
      if (parentEvent.kind !== kinds.Highlights) {
        throw new Error('Parent annotation is not a highlight');
      }

      rootTags = [
        ["E", parentAnnotationId],
        ["K", parentEvent.kind.toString()],
        ["P", parentAnnotation.user],
      ];

      parentTags = [
        ["e", parentAnnotationId],
        ["k", parentEvent.kind.toString()],
        ["p", parentAnnotation.user],
      ];
    }

    return {
      kind: 1111,
      created_at: Math.floor(Date.now() / 1000),
      content: text,
      tags: [
        ...tags.map(tag => ['t', tag]),
        ...rootTags,
        ...parentTags,
      ],
    };
  }

  async convertToAnnotation({ 
    event, 
    uri, 
    relays 
  }: ConvertHighlightOptions): Promise<SavedAnnotation> {
    const profile = await this._nostrProfileService.fetchProfile(event.pubkey);

    const isCurrentUser = event.pubkey === this._currentUserId;

    const createdAt = new Date(event.created_at * 1000).toISOString()

    return {
      $tag: 'a:' + generateHexString(8),
      $highlight: false,
      $cluster: isCurrentUser ? 'user-annotations' : 'other-content',
      
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
      // TODO: nostr: check Reports
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
          selector: this.deserializeSelectors(event),
        },
      ],
      nostr_event: event,
    };
  }

  deserializeSelectors(event: NostrEvent): SupportedSelector[] {
    const tags = event.tags;
    
    let textQuoteTag = tags.find(tag => tag[0] === 'textquoteselector');

    if (!textQuoteTag) {
      textQuoteTag = ['textquoteselector', event.content];
    }

    const textQuoteSelector: TextQuoteSelector = {
      type: 'TextQuoteSelector',
      exact: textQuoteTag[1],
      prefix: textQuoteTag[2],
      suffix: textQuoteTag[3],
    };

    const textPositionTag = tags.find(tag => tag[0] === 'textpositionselector');

    let textPositionSelector: TextPositionSelector | undefined;

    if (textPositionTag) {
      textPositionSelector = {
        type: 'TextPositionSelector',
        start: parseInt(textPositionTag[1]),
        end: parseInt(textPositionTag[2]),
      };
    }

    const rangeTag = tags.find(tag => tag[0] === 'rangeselector');

    let rangeSelector: RangeSelector | undefined;

    if (rangeTag) {
      rangeSelector = {
        type: 'RangeSelector',
        startContainer: rangeTag[1],
        endContainer: rangeTag[2],
        startOffset: parseInt(rangeTag[3]),
        endOffset: parseInt(rangeTag[4]),
      };
    }

    return [
      textQuoteSelector, 
      textPositionSelector, 
      rangeSelector
    ].filter(Boolean) as SupportedSelector[];
  }

  async convertThread({ 
    threadEvent, 
    rootEventId,
    relays 
  }: ConvertThreadOptions): Promise<SavedAnnotation | null> {
    const rootAnnotation = this._store.findAnnotationByID(rootEventId);
    
    if (!rootAnnotation) {
      console.warn(`
        No root annotation found for event: ${threadEvent.id}, 
        rootEventId: ${rootEventId}
      `);

      return null;
    }
    
    const profile = await this._nostrProfileService.fetchProfile(threadEvent.pubkey);

    const createdAt = new Date(threadEvent.created_at * 1000).toISOString()

    const references = await this._mergeReferences({ 
      rootAnnotation, 
      event: threadEvent 
    });

    const isCurrentUser = threadEvent.pubkey === this._currentUserId;

    return {
      $highlight: false,
      $cluster: isCurrentUser ? 'user-annotations' : 'other-content',
      $tag: 'a:' + generateHexString(8),

      id: threadEvent.id,
      created: createdAt,
      updated: createdAt,
      document: {
        title: rootAnnotation.document.title,
      },
      group: '__world__',
      hidden: false,
      links: {
        html: nostrEventUrl({ settings: this._settings, store: this._store, event: threadEvent, relays })
      },
      // TODO: nostr: check Reports
      flagged: false,
      user: threadEvent.pubkey,
      user_info: {
        display_name: profile.displayName || null
      },
      tags: getHashtags(threadEvent),
      text: threadEvent.content,
      uri: rootAnnotation.uri,
      permissions: {
        read: ['group:__world__'],
        update: [],
        delete: [],
      },
      target: [
        {
          source: rootAnnotation.uri
        },
      ],
      references,
      nostr_event: threadEvent,
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
    rootAnnotation, 
    event 
  }: MergeReferencesOptions): Promise<string[]> {
    // Get the reference to the root annotation (uppercase 'E' tag)
    const rootReferenceId = event.tags.find(tag => tag[0] === 'E')?.[1];

    if (rootReferenceId !== rootAnnotation.id) {
      throw new Error('Root reference ID does not match root annotation ID');
    }
    
    // Get the reference to parent thread event if exists (lowercase 'e' tag)
    const parentAnnotationId = event.tags.find(tag => tag[0] === 'e')?.[1];
    
    // If this is a root thread event (only has 'E' tag)
    if (!parentAnnotationId) {
      return [rootReferenceId];
    }
    
    // For thread replies, get the parent thread annotation
    const parentAnnotation = await retryWithBackoff(
      async (retryCount: number) => {
        const parentAnnotation = this._store.findAnnotationByID(parentAnnotationId);
        
        if (!parentAnnotation) {
          console.warn(`
            No thread annotation found for event: ${event.id}, 
            threadReferenceId: ${parentAnnotationId},
            attempt ${retryCount + 1}/3
          `);
          
          throw new Error('Thread annotation not found');
        }
        
        return parentAnnotation;
      }
    );

    if (!parentAnnotation) {
      throw new Error('Failed to fetch thread annotation after all retries');
    }

    // Build the reference chain:
    // Use parent's references (which include rootReferenceId) and append current threadReferenceId
    return [
      ...(parentAnnotation.references || []),
      parentAnnotationId
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

function getHashtags(event: NostrEvent) {
  return event.tags.filter(tag => tag[0] === 't')
    .map(tag => tag[1] || '')
    .filter(tag => tag !== '');
}
