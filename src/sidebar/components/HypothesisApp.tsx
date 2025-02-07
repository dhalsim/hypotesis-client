import { confirm } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useEffect, useMemo } from 'preact/hooks';

import type { SidebarSettings } from '../../types/config';
import { shouldAutoDisplayTutorial } from '../helpers/session';
import { applyTheme } from '../helpers/theme';
import { withServices } from '../service-context';
import type { AuthService } from '../services/auth';
import type { FrameSyncService } from '../services/frame-sync';
import type { NostrSettingsService } from '../services/nostr-settings';
import type { ToastMessengerService } from '../services/toast-messenger';
import { useSidebarStore } from '../store';
import AnnotationView from './AnnotationView';
import HelpPanel from './HelpPanel';
import NostrConnectPanel from './NostrConnectPanel';
import NotebookView from './NotebookView';
import ProfileView from './ProfileView';
import ShareDialog from './ShareDialog';
import SidebarView from './SidebarView';
// TODO: nostr: probably StreamView is not used in the client anymore, 
// but this can be used to do global search with using StreamSearchInput
//import StreamView from './StreamView';
import ToastMessages from './ToastMessages';
import TopBar from './TopBar';
import SearchPanel from './search/SearchPanel';

export type HypothesisAppProps = {
  auth: AuthService;
  frameSync: FrameSyncService;
  settings: SidebarSettings;
  toastMessenger: ToastMessengerService;
  nostrSettingsService: NostrSettingsService;
};

/**
 * The root component for the Hypothesis client.
 *
 * This handles login/logout actions and renders the top navigation bar
 * and content appropriate for the current route.
 */
function HypothesisApp({
  settings,
  nostrSettingsService,
}: HypothesisAppProps) {
  const store = useSidebarStore();
  const route = store.route();
  const isModalRoute = route === 'notebook' || route === 'profile';

  const backgroundStyle = useMemo(
    () => applyTheme(['appBackgroundColor'], settings),
    [settings],
  );
  const isThemeClean = settings.theme === 'clean';

  const isSidebar = route === 'sidebar';

  useEffect(() => {
    // TODO: nostr: when to open the help panel? it used to check the profile and some settings
    if (shouldAutoDisplayTutorial(isSidebar)) {
      store.openSidebarPanel('help');
    }
  }, [isSidebar, store]);

  const promptToLogout = async () => {
    const drafts = store.countDrafts();
    if (drafts === 0) {
      return true;
    }

    let message = '';
    if (drafts === 1) {
      message =
        'You have an unsaved annotation.\n' +
        'Do you really want to discard this draft?';
    } else if (drafts > 1) {
      message =
        'You have ' +
        drafts +
        ' unsaved annotations.\n' +
        'Do you really want to discard these drafts?';
    }

    return confirm({
      title: 'Discard drafts?',
      message,
      confirmAction: 'Discard',
    });
  };

  const onNostrLogout = async () => {
    if (!(await promptToLogout())) {
      return;
    }

    store.removeAnnotations(store.unsavedAnnotations());
    store.discardAllDrafts();
    nostrSettingsService.setPrivateKey(null);
  };

  return (
    <div
      className={classnames(
        'h-full min-h-full overflow-auto',
        // Precise padding to align with annotation cards in content
        // Larger padding on bottom for wide screens
        'lg:pb-16 bg-grey-2',
        'js-thread-list-scroll-root',
        {
          'theme-clean': isThemeClean,
          // Make room at top for the TopBar (40px) plus custom padding (9px)
          // but not in the Notebook or Profile, which don't use the TopBar
          'pt-[49px]': !isModalRoute,
          'p-4 lg:p-12': isModalRoute,
        },
      )}
      data-testid="hypothesis-app"
      style={backgroundStyle}
    >
      {!isModalRoute && (
        <TopBar
          onNostrLogout={onNostrLogout}
          isSidebar={isSidebar}
        />
      )}
      <div className="container">
        <ToastMessages />
        <HelpPanel />
        <SearchPanel />
        <ShareDialog />
        <NostrConnectPanel
          onClose={() => store.toggleSidebarPanel('nostrConnectPanel')}
        />

        {route && (
          <main>
            {/* TODO: nostr: we can use nip42 authentication: https://nips.nostr.com/42 */}
            {route === 'annotation' && <AnnotationView onLogin={() => {}} />}
            {route === 'notebook' && <NotebookView />}
            {route === 'profile' && <ProfileView />}
            {/* <StreamView /> */}
            {route === 'sidebar' && (
              // TODO: nostr: we can use nip42 authentication: https://nips.nostr.com/42
              <SidebarView onLogin={() => {}} />
            )}
          </main>
        )}
      </div>
    </div>
  );
}

export default withServices(HypothesisApp, [
  'auth',
  'frameSync',
  'settings',
  'toastMessenger',
  'nostrSettingsService',
]);
