// Load polyfill for :focus-visible pseudo-class.
import 'focus-visible';
import { render } from 'preact';
// Enable debugging checks for Preact. Removed in prod builds by Rollup config.
import 'preact/debug';

import { parseJsonConfig } from '../boot/parse-json-config';
import { Injector } from '../shared/injector';
import type { ConfigFromSidebar } from '../types/config';
import type { SidebarSettings } from '../types/config';
import HypothesisApp from './components/HypothesisApp';
import LaunchErrorPanel from './components/LaunchErrorPanel';
import { buildSettings } from './config/build-settings';
import { checkEnvironment } from './config/check-env';
import {
  startServer as startRPCServer,
  preStartServer as preStartRPCServer,
} from './cross-origin-rpc';
import { ServiceContext } from './service-context';
import { AnnotationsService } from './services/annotations';
import { AutosaveService } from './services/autosave';
import { DashboardService } from './services/dashboard';
import { FrameSyncService } from './services/frame-sync';
import { GroupsService } from './services/groups';
import { LocalStorageService } from './services/local-storage';
import { PersistedDefaultsService } from './services/persisted-defaults';
import { RouterService } from './services/router';
import { TagsService } from './services/tags';
import { ThreadsService } from './services/threads';
import { ToastMessengerService } from './services/toast-messenger';
import { NostrHighlightAdapterService } from './services/nostr-highlight-adapter';
import { NostrFetchHighlightsService } from './services/nostr-fetch-highlights';
import { NostrProfileService } from './services/nostr-profile';
import { NostrRelaysService } from './services/nostr-relays';
import { NostrSettingsService } from './services/nostr-settings';
import { NostrPublisherService } from './services/nostr-publisher';
import { NostrFetchThreadsService } from './services/nostr-fetch-threads';
import { NostrThreadAdapterService } from './services/nostr-thread-adapter';
import { createSidebarStore } from './store';
import type { SidebarStore } from './store';
import { disableOpenerForExternalLinks } from './util/disable-opener-for-external-links';

// Read settings rendered into sidebar app HTML by service/extension.
const configFromSidebar = parseJsonConfig(document) as ConfigFromSidebar;

// Check for known issues which may prevent the client from working.
//
// If any checks fail we'll log warnings and disable error reporting, but try
// and continue anyway.
const envOk = checkEnvironment(window);

console.warn('envOk', envOk);

// Prevent tab-jacking.
disableOpenerForExternalLinks(document.body);

/**
 * Update the route in the store based on the initial URL.
 *
 * @inject
 */
function syncRoute(router: RouterService) {
  router.sync();
}

/**
 * Perform the initial fetch of groups and user profile.
 *
 * @inject
 */
function loadGroupsAndProfile(groups: GroupsService) {
  groups.load();
}

/**
 * Initialize background processes provided by various services.
 *
 * These processes include persisting or synchronizing data from one place
 * to another.
 *
 * @inject
 */
function initServices(
  autosaveService: AutosaveService,
  persistedDefaults: PersistedDefaultsService,
) {
  autosaveService.init();
  persistedDefaults.init();
}

/**
 * Setup connection between sidebar and host page.
 *
 * @inject
 */
function setupFrameSync(
  frameSync: FrameSyncService,
  store: SidebarStore,
  toastMessenger: ToastMessengerService,
) {
  if (store.route() === 'sidebar') {
    frameSync.connect().catch(() => {
      toastMessenger.error(
        'Hypothesis failed to connect to the web page. Try reloading the page.',
        {
          autoDismiss: false,
        },
      );
    });
  }
}

/**
 * Launch the client application corresponding to the current URL.
 *
 * @param appEl - Root HTML container for the app
 */
function startApp(settings: SidebarSettings, appEl: HTMLElement) {
  const container = new Injector();

  // Register services.
  container
    .register('annotationsService', AnnotationsService)
    .register('autosaveService', AutosaveService)
    .register('dashboard', DashboardService)
    .register('frameSync', FrameSyncService)
    .register('groups', GroupsService)
    .register('localStorage', LocalStorageService)
    .register('persistedDefaults', PersistedDefaultsService)
    .register('nostrRelaysService', NostrRelaysService)
    .register('nostrProfileService', NostrProfileService)
    .register('nostrSettingsService', NostrSettingsService)
    .register('nostrFetchHighlightsService', NostrFetchHighlightsService)
    .register('nostrPublisherService', NostrPublisherService)
    .register('nostrHighlightAdapterService', NostrHighlightAdapterService)
    .register('nostrFetchThreadsService', NostrFetchThreadsService)
    .register('nostrThreadAdapterService', NostrThreadAdapterService)
    
    .register('router', RouterService)
    .register('tags', TagsService)
    .register('threadsService', ThreadsService)
    .register('toastMessenger', ToastMessengerService)
    .register('store', { factory: createSidebarStore });

  // Register utility values/classes.
  //
  // nb. In many cases these can be replaced by direct imports in the services
  // that use them, since they don't depend on instances of other services.
  container
    .register('$window', { value: window })
    .register('settings', { value: settings });

  // Initialize services.
  //
  // We sync the route with the initial URL as the first step, because
  // initialization of other services may depend on the route (eg. enabling
  // sidebar-only behavior).
  container.run(syncRoute);
  container.run(initServices);
  
  // TODO: nostr: remove this once Nostr is fully implemented
  container.run(loadGroupsAndProfile);
  
  container.run(startRPCServer);
  container.run(setupFrameSync);

  // Render the UI.
  render(
    <ServiceContext.Provider value={container}>
      <HypothesisApp />
    </ServiceContext.Provider>,
    appEl,
  );
}

function reportLaunchError(error: Error, appEl: HTMLElement) {
  // Report error. In the sidebar the console log is the only notice the user
  // gets because the sidebar does not appear at all if the app fails to start.
  console.error('Failed to start Hypothesis client: ', error);

  // For apps where the UI is visible (eg. notebook, single-annotation view),
  // show an error notice.
  render(<LaunchErrorPanel error={error} />, appEl);
}

const appEl = document.querySelector('hypothesis-app') as HTMLElement;

// Start capturing RPC requests before we start the RPC server (startRPCServer)
preStartRPCServer();

buildSettings(configFromSidebar)
  .then(settings => {
    startApp(settings, appEl);
  })
  .catch(err => reportLaunchError(err, appEl));
