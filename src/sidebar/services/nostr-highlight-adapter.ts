import { kinds } from "nostr-tools";
import type { NostrEvent, EventTemplate } from "nostr-tools";

import { generateHexString } from '../../shared/random';
import type { SidebarSettings } from "../../types/config";
import type { 
  RangeSelector, 
  Annotation,
  SavedAnnotation, 
  Selector, 
  TextPositionSelector, 
  TextQuoteSelector 
} from "../../types/api";

import { getHashtags, nostrEventUrl } from "../helpers/nostr";
import type { SidebarStore } from "../store";

import type { NostrProfileService } from "./nostr-profile";

type ConvertHighlightOptions = {
  event: NostrEvent;
  uri: string;
  relays: string[];
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

  convertToEvent(annotation: Annotation): EventTemplate {
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

  serializeSelectors(
    textQuoteSelector: TextQuoteSelector, 
    selectors: Selector[]
  ): string[][] {
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
