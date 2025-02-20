// TODO: nostr: review for nostr
import shallowEqual from 'shallowequal';

// @ts-ignore - TS doesn't know about SVG files.
import { default as logo } from '../../images/icons/logo.svg';
import type { Group } from '../../types/api';
import { isReply } from '../helpers/annotation-metadata';
import { PUBLIC_GROUP_ID } from '../helpers/groups';
import type { SidebarStore } from '../store';
import { watch } from '../util/watch';

const DEFAULT_ORG_ID = '__default__';

const DEFAULT_ORGANIZATION = {
  id: DEFAULT_ORG_ID,
  name: '__DEFAULT__',
  logo: 'data:image/svg+xml;utf8,' + encodeURIComponent(logo),
};

/**
 * For any group that does not have an associated organization, populate with
 * the default Hypothesis organization.
 *
 * Mutates group objects in place
 */
function injectOrganizations(groups: Group[]) {
  groups.forEach(group => {
    if (!group.organization || typeof group.organization !== 'object') {
      group.organization = DEFAULT_ORGANIZATION;
    }
  });
}

/**
 * Service for fetching groups from the API and adding them to the store.
 *
 * The service also provides a `focus` method for switching the active group
 * and `leave` method to remove the current user from a private group.
 *
 * @inject
 */
export class GroupsService {
  private _store: SidebarStore;
  private _reloadSetUp: boolean;

  constructor(
    store: SidebarStore,
  ) {
    this._store = store;
    this._reloadSetUp = false;
  }

  /**
   * Return the main document URI that is used to fetch groups associated with
   * the site that the user is on.
   */
  private _mainURI(): string | null {
    return this._store.defaultContentFrame()?.uri ?? null;
  }

  /**
   * Set up automatic re-fetching of groups in response to various events
   * in the sidebar.
   */
  private _setupAutoReload() {
    if (this._reloadSetUp) {
      return;
    }
    this._reloadSetUp = true;

    // Reload groups when main document URI changes.
    watch(
      this._store.subscribe,
      () => this._mainURI(),
      () => this.load(),
    );

    // Reload groups when user ID changes. This is a bit inefficient since it
    // means we are not fetching the groups and profile concurrently after
    // logging in or logging out.
    watch(
      this._store.subscribe,
      () =>
        [
          this._store.isNostrLoggedIn(),
          this._store.getNostrProfile()?.publicKeyHex,
        ] as const,
      (_, [prevFetchedProfile]) => {
        if (!prevFetchedProfile) {
          // Ignore the first time that the profile is loaded.
          return;
        }
        void this.load();
      },
      shallowEqual,
    );
  }

  /**
   * Add groups to the store and set the initial focused group.
   */
  private _addGroupsToStore(groups: Group[], groupToFocus: string | null) {
    // Add a default organization to groups that don't have one. The organization
    // provides the logo to display when the group is selected and is also used
    // to order groups.
    injectOrganizations(groups);

    const isFirstLoad = this._store.allGroups().length === 0;
    const prevFocusedGroup = this._store.getDefault('focusedGroup');

    this._store.loadGroups(groups);

    if (isFirstLoad) {
      if (groupToFocus && groups.some(g => g.id === groupToFocus)) {
        this.focus(groupToFocus);
      } else if (
        prevFocusedGroup &&
        groups.some(g => g.id === prevFocusedGroup)
      ) {
        this.focus(prevFocusedGroup);
      }
    }
  }

  /**
   * Fetch the groups associated with the current user and document, as well
   * as any groups that have been direct-linked to.
   */
  private async _loadGroupsForUserAndDocument(): Promise<Group[]> {
    this._setupAutoReload();

    const groups: Group[] = [
      {
        "id": PUBLIC_GROUP_ID,
        "links": {
            "html": "https://hypothes.is/groups/__world__/public"
        },
        "name": "Public",
        "organization": {
            "name": "Hypothesis",
            "logo": "https://hypothes.is/organizations/__default__/logo",
            "id": "__default__",
            "default": true
        },
        "type": "open",
        "scopes": {
            "enforced": false,
            "uri_patterns": []
        },
        "isMember": true,
        "canLeave": false,
        "isScopedToUri": true,

        "logo": "https://hypothes.is/organizations/__default__/logo",
      }
    ];

    this._addGroupsToStore(groups, null);

    return groups;
  }

  /**
   * Fetch groups from the API, load them into the store and set the focused
   * group.
   *
   * There are two main scenarios:
   *
   * 1. The groups loaded depend on the current user, current document URI and
   *    active direct links. This is the default.
   *
   *    On startup, `load()` must be called to trigger the initial groups fetch.
   *    Subsequently groups are automatically reloaded if the logged-in user or
   *    main document URI changes.
   *
   * 2. The annotation service specifies exactly which groups to load via the
   *    configuration it passes to the client.
   */
  async load(): Promise<Group[]> {
    return this._loadGroupsForUserAndDocument();
  }

  /**
   * Update the focused group. Update the store, then check to see if
   * there are any new (unsaved) annotations—if so, update those annotations
   * such that they are associated with the newly-focused group.
   */
  focus(groupId: string) {
    const prevGroupId = this._store.focusedGroupId();

    this._store.focusGroup(groupId);

    const newGroupId = this._store.focusedGroupId();

    const groupHasChanged = prevGroupId !== newGroupId && prevGroupId !== null;
    if (groupHasChanged && newGroupId) {
      // Move any top-level new annotations to the newly-focused group.
      // Leave replies where they are.
      const updatedAnnotations = this._store
        .newAnnotations()
        .filter(ann => !isReply(ann))
        .map(ann => ({ ...ann, group: newGroupId }));

      if (updatedAnnotations.length) {
        this._store.addAnnotations(updatedAnnotations);
      }

      // Persist this group as the last focused group default
      this._store.setDefault('focusedGroup', newGroupId);
    }
  }

  /**
   * Request to remove the current user from a group.
   */
  // leave(id: string): Promise<void> {
  //   // The groups list will be updated in response to a session state
  //   // change notification from the server. We could improve the UX here
  //   // by optimistically updating the session state
  //   return this._api.group.member.delete({
  //     pubid: id,
  //     userid: 'me',
  //   });
  // }
}
