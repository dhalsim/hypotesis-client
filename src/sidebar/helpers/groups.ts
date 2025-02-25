import escapeStringRegexp from 'escape-string-regexp';

import type { Group, GroupIdentifier } from '../../types/api';
import type { SidebarSettings } from '../../types/config';
import { serviceConfig } from '../config/service-config';

/**
 * Return true if users are allowed to leave groups.
 *
 * Third-party authorities currently have to opt-in to enabling this, since
 * users may not have a way to rejoin a group after leaving.
 */
function allowLeavingGroups(settings: SidebarSettings): boolean {
  const config = serviceConfig(settings);
  if (!config) {
    return true;
  }
  return !!config.allowLeavingGroups;
}

export const PUBLIC_GROUP_ID = '__world__';

/**
 * Combine groups from multiple api calls together to form a unique list of groups.
 * Add an isMember property to each group indicating whether the logged in user is a member.
 * Add an isScopedToUri property to each group indicating whether the uri matches the group's
 *   uri patterns. If no uri patterns are specified, defaults to True.
 *
 * @param userGroups - groups the user is a member of
 * @param featuredGroups - all other groups, may include some duplicates from the userGroups
 * @param uri - uri of the current page
 */
export function combineGroups(
  userGroups: Group[],
  featuredGroups: Group[],
  uri: string | null,
  settings: SidebarSettings,
) {
  const worldGroup = featuredGroups.find(g => g.id === PUBLIC_GROUP_ID);
  if (worldGroup) {
    userGroups.unshift(worldGroup);
  }

  const myGroupIds = userGroups.map(g => g.id);
  featuredGroups = featuredGroups.filter(g => !myGroupIds.includes(g.id));

  // Set flag indicating whether user is a member of the group.
  featuredGroups.forEach(group => (group.isMember = false));
  userGroups.forEach(group => (group.isMember = true));

  const groups = userGroups.concat(featuredGroups);

  // Set flag indicating whether user can leave group.
  for (const group of groups) {
    group.canLeave =
      allowLeavingGroups(settings) &&
      group.isMember &&
      // People should not be able to leave the "Public" group.
      group.id !== PUBLIC_GROUP_ID;
  }

  // Add isScopedToUri property indicating whether a group is within scope
  // of the given uri. If the scope check cannot be performed, isScopedToUri
  // defaults to true.
  groups.forEach(group => (group.isScopedToUri = isScopedToUri(group, uri)));

  return groups;
}

function isScopedToUri(group: Group, uri: string | null): boolean {
  /* If a scope check cannot be performed, meaning:
   * - the group doesn't have a scopes attribute
   * - the group has no scopes.uri_patterns present
   * - there is no uri to compare against (aka: uri=null)
   * the group is defaulted to in-scope.
   */
  if (group.scopes && group.scopes.uri_patterns.length > 0 && uri) {
    return uriMatchesScopes(uri, group.scopes.uri_patterns);
  }
  return true;
}

function uriMatchesScopes(uri: string, scopes: string[]): boolean {
  return scopes.some(uriRegex =>
    uri.match(
      // Convert *'s to .*'s for regex matching and escape all other special characters.
      uriRegex.split('*').map(escapeStringRegexp).join('.*'),
    ),
  );
}

/**
 * Find groups in `groups` by GroupIdentifier, which may be either an `id` or
 * `groupid`.
 */
function findGroupsByAnyIds(
  groupIds: GroupIdentifier[],
  groups: Group[],
): Group[] {
  return groups.filter(
    g => groupIds.includes(g.id) || (g.groupid && groupIds.includes(g.groupid)),
  );
}

/**
 * Attempt to convert a list in which each entry might be either an `id`
 * (pubid) or a `groupid` into a list of `id`s by locating associated groups
 * in the set of all `groups`. Only return entries for groups that can be
 * found in `groups`.
 */
export function normalizeGroupIds(
  groupIds: GroupIdentifier[],
  groups: Group[],
): Group['id'][] {
  return findGroupsByAnyIds(groupIds, groups).map(g => g.id);
}
