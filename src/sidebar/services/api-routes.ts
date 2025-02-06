import type {
  LinksResponse,
  RouteMap,
} from '../../types/api';

/**
 * A service which fetches and caches API route metadata.
 */
// @inject
export class APIRoutesService {
  constructor() {}

  /**
   * Fetch and cache API route metadata.
   *
   * Routes are fetched without any authentication and therefore assumed to be
   * the same regardless of whether the user is authenticated or not.
   *
   * @return Map of routes to route metadata.
   */
  async routes(): Promise<RouteMap> {
    return {
      "analytics": {
        "events": {
          "create": {
            "method": "POST",
            "url": "https://hypothes.is/api/analytics/events",
            "desc": "Create a new analytics event"
          }
        }
      },
      "annotation": {
        "create": {
          "method": "POST",
          "url": "https://hypothes.is/api/annotations",
          "desc": "Create an annotation"
        },
        "delete": {
          "method": "DELETE",
          "url": "https://hypothes.is/api/annotations/:id",
          "desc": "Delete an annotation"
        },
        "read": {
          "method": "GET",
          "url": "https://hypothes.is/api/annotations/:id",
          "desc": "Fetch an annotation"
        },
        "update": {
          "method": "PATCH",
          "url": "https://hypothes.is/api/annotations/:id",
          "desc": "Update an annotation"
        },
        "flag": {
          "method": "PUT",
          "url": "https://hypothes.is/api/annotations/:id/flag",
          "desc": "Flag an annotation for review"
        },
        "hide": {
          "method": "PUT",
          "url": "https://hypothes.is/api/annotations/:id/hide",
          "desc": "Hide an annotation as a group moderator"
        },
        "unhide": {
          "method": "DELETE",
          "url": "https://hypothes.is/api/annotations/:id/hide",
          "desc": "Unhide an annotation as a group moderator"
        }
      },
      "search": {
        "method": "GET",
        "url": "https://hypothes.is/api/search",
        "desc": "Search for annotations"
      },
      "bulk": {
        "action": {
          "method": "POST",
          "url": "https://hypothes.is/api/bulk",
          "desc": "Perform multiple operations in one call"
        },
        "annotation": {
          "method": "POST",
          "url": "https://hypothes.is/api/bulk/annotation",
          "desc": "Retrieve a large number of annotations in one go"
        },
        "group": {
          "method": "POST",
          "url": "https://hypothes.is/api/bulk/group",
          "desc": "Retrieve a large number of groups in one go"
        },
        "lms": {
          "annotations": {
            "method": "POST",
            "url": "https://hypothes.is/api/bulk/lms/annotations",
            "desc": "Retrieve annotations for LMS metrics"
          }
        }
      },
      "group": {
        "member": {
          "add": {
            "method": "POST",
            "url": "https://hypothes.is/api/groups/:pubid/members/:userid",
            "desc": "Add a user to a group"
          },
          "edit": {
            "method": "PATCH",
            "url": "https://hypothes.is/api/groups/:pubid/members/:userid",
            "desc": "Change a user's role in a group"
          },
          "read": {
            "method": "GET",
            "url": "https://hypothes.is/api/groups/:pubid/members/:userid",
            "desc": "Fetch a group membership"
          },
          "delete": {
            "method": "DELETE",
            "url": "https://hypothes.is/api/groups/:pubid/members/:userid",
            "desc": "Remove a user from a group"
          }
        },
        "members": {
          "read": {
            "method": "GET",
            "url": "https://hypothes.is/api/groups/:pubid/members",
            "desc": "Fetch a list of all members of a group"
          }
        },
        "create": {
          "method": "POST",
          "url": "https://hypothes.is/api/groups",
          "desc": "Create a new group"
        },
        "read": {
          "method": "GET",
          "url": "https://hypothes.is/api/groups/:id",
          "desc": "Fetch a group"
        },
        "update": {
          "method": "PATCH",
          "url": "https://hypothes.is/api/groups/:id",
          "desc": "Update a group"
        }
      },
      "groups": {
        "read": {
          "method": "GET",
          "url": "https://hypothes.is/api/groups",
          "desc": "Fetch the user's groups"
        }
      },
      "links": {
        "method": "GET",
        "url": "https://hypothes.is/api/links",
        "desc": "URL templates for generating URLs for HTML pages"
      },
      "profile": {
        "read": {
          "method": "GET",
          "url": "https://hypothes.is/api/profile",
          "desc": "Fetch the user's profile"
        },
        "groups": {
          "read": {
            "method": "GET",
            "url": "https://hypothes.is/api/profile/groups",
            "desc": "Fetch the current user's groups"
          }
        },
        "update": {
          "method": "PATCH",
          "url": "https://hypothes.is/api/profile",
          "desc": "Update a user's preferences"
        }
      },
      "user": {
        "create": {
          "method": "POST",
          "url": "https://hypothes.is/api/users",
          "desc": "Create a new user"
        },
        "read": {
          "method": "GET",
          "url": "https://hypothes.is/api/users/:userid",
          "desc": "Fetch a user"
        },
        "update": {
          "method": "PATCH",
          "url": "https://hypothes.is/api/users/:username",
          "desc": "Update a user"
        }
      }
    };
  }

  /**
   * Fetch and cache service page links from the API.
   */
  async links(): Promise<LinksResponse> {
    return {
      "account.settings": "https://hypothes.is/account/settings",
      "forgot-password": "https://hypothes.is/forgot-password",
      "groups.new": "https://hypothes.is/groups/new",
      "help": "https://hypothes.is/docs/help",
      "oauth.authorize": "https://hypothes.is/oauth/authorize",
      "oauth.revoke": "https://hypothes.is/oauth/revoke",
      "search.tag": "https://hypothes.is/search?q=tag%3A%22:tag%22",
      "signup": "https://hypothes.is/signup",
      "user": "https://hypothes.is/u/:user",
      "websocket": "wss://h-websocket.hypothes.is/ws"
    };
  }
}
