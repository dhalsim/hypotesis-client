import { useEffect, useRef } from 'preact/hooks';

import { tabForAnnotation } from '../helpers/tabs';
import { withServices } from '../service-context';
import { useSidebarStore } from '../store';
import type { FrameSyncService } from '../services/frame-sync';
import type { NostrHighlightsFetcherService } from '../services/nostr-highlights-fetcher';
import type { NostrPageNotesFetcherService } from '../services/nostr-page-comments-fetcher';

import SidebarContentError from './SidebarContentError';
import SidebarTabs from './SidebarTabs';
import FilterControls from './search/FilterControls';

export type SidebarViewProps = {
  onLogin: () => void;

  // injected
  frameSync: FrameSyncService;
  nostrHighlightsFetcherService: NostrHighlightsFetcherService;
  nostrPageNotesFetcherService: NostrPageNotesFetcherService;
};

/**
 * Render the content of the sidebar, including tabs and threads (annotations)
 */
function SidebarView({
  frameSync,
  onLogin,
  nostrHighlightsFetcherService,
  nostrPageNotesFetcherService
}: SidebarViewProps) {
  // Store state values
  const store = useSidebarStore();
  const focusedGroupId = store.focusedGroupId();
  const isLoading = store.isLoading();
  const isLoggedIn = store.isNostrLoggedIn();

  const linkedAnnotationId = store.directLinkedAnnotationId();
  
  const linkedAnnotation = linkedAnnotationId
    ? store.findAnnotationByID(linkedAnnotationId)
    : undefined;
  
    const directLinkedTab = linkedAnnotation
    ? tabForAnnotation(linkedAnnotation)
    : 'annotation';

  const searchUris = store.searchUris();
  const userId = store.getNostrProfile()?.publicKeyHex;

  // If, after loading completes, no `linkedAnnotation` object is present when
  // a `linkedAnnotationId` is set, that indicates an error
  const hasDirectLinkedAnnotationError =
    !isLoading && linkedAnnotationId ? !linkedAnnotation : false;

  const hasDirectLinkedGroupError = store.directLinkedGroupFetchFailed();

  const hasContentError =
    hasDirectLinkedAnnotationError || hasDirectLinkedGroupError;

  // Whether to render the new filter UI. Note that when the search panel is
  // open, filter controls are integrated into it. The UI may render nothing
  // if no filters are configured or selection is active.
  const isSearchPanelOpen = store.isSidebarPanelOpen('searchAnnotations');
  const showFilterControls = !hasContentError && !isSearchPanelOpen;

  // Show a CTA to log in if successfully viewing a direct-linked annotation
  // and not logged in
  const showLoggedOutMessage =
    linkedAnnotationId &&
    !isLoggedIn &&
    !hasDirectLinkedAnnotationError &&
    !isLoading;

  useEffect(() => {
    if (showLoggedOutMessage) {
      store.openSidebarPanel('nostrConnectPanel');
    }
  }, [showLoggedOutMessage, store]);

  const prevGroupId = useRef(focusedGroupId);

  // Reload annotations when group, user or document search URIs change
  useEffect(() => {
    if (!prevGroupId.current || prevGroupId.current !== focusedGroupId) {
      // Clear any selected annotations and filters when the focused group
      // changes.
      // We don't clear the selection/filters on the initial load when
      // the focused group transitions from null to non-null, as this would clear
      // any filters intended to be used for the initial display (eg. to focus
      // on a particular user).
      if (prevGroupId.current) {
        // Respect applied focus-mode filtering when changing focused group
        const restoreFocus = store.focusState().active;

        store.clearSelection();
        if (restoreFocus) {
          store.toggleFocusMode({ active: true });
        }
      }
      prevGroupId.current = focusedGroupId;
    }

    // it takes time to load searchUris
    const uri = searchUris[0];
    
    if (focusedGroupId && uri) {
      nostrHighlightsFetcherService.loadByUri({
        uri,
        onError: (error) => { 
          // eslint-disable-next-line no-console
          console.log(error); 
        }
      });

      nostrPageNotesFetcherService.loadPageNotes({
        uri,
        onError: (error) => { 
          // eslint-disable-next-line no-console
          console.log(error); 
        }
      });
    }
  }, [
    store, 
    nostrHighlightsFetcherService, 
    nostrPageNotesFetcherService, 
    focusedGroupId, 
    userId, 
    searchUris
  ]);

  // When a `linkedAnnotationAnchorTag` becomes available, scroll to it
  // and focus it
  useEffect(() => {
    if (linkedAnnotation && linkedAnnotation.$orphan === false) {
      frameSync.hoverAnnotation(linkedAnnotation);
      frameSync.scrollToAnnotation(linkedAnnotation);
      store.selectTab(directLinkedTab);
    } else if (linkedAnnotation) {
      // Make sure to allow for orphaned annotations (which won't have an anchor)
      store.selectTab(directLinkedTab);
    }
  }, [directLinkedTab, frameSync, linkedAnnotation, store]);
  
  return (
    <div className="relative">
      <h2 className="sr-only">Annotations</h2>
      {showFilterControls && <FilterControls withCardContainer />}
      {/* TODO: nostr: we can use nip42 authentication: https://nips.nostr.com/42
      // LoginPromptPanel */}
      {hasDirectLinkedAnnotationError && (
        <SidebarContentError
          errorType="annotation"
          onLoginRequest={onLogin}
          showClearSelection={true}
        />
      )}
      {hasDirectLinkedGroupError && (
        <SidebarContentError errorType="group" onLoginRequest={onLogin} />
      )}
      {!hasContentError && <SidebarTabs isLoading={isLoading} />}
    </div>
  );
}

export default withServices(SidebarView, [
  'frameSync',
  'nostrHighlightsFetcherService',
  'nostrPageNotesFetcherService',
]);
