import { hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';

import { createStoreModule, makeAction } from '../create-store';

export type NostrProfile = {
  publicKeyHex: string;
  displayName?: string;
  picture?: string;
  loading: boolean;
};

export type NostrState = {
  privateKey: Uint8Array | null;
  publicKeyHex: string | null;
  connectMode: 'nsec' | 'bunker' | 'nostr-connect';
  profile: NostrProfile | null;
  nostrProfileUrl: string;
  nostrSearchUrl: string;
  nostrEventUrl: string;
  openHelpPanel: boolean;
};

const initialState: NostrState = {
  privateKey: null,
  publicKeyHex: null,
  connectMode: 'nsec',
  profile: null,
  nostrProfileUrl: 'https://njump.me',
  nostrSearchUrl: 'https://nostr.band/?q=',
  nostrEventUrl: 'https://njump.me',
  openHelpPanel: true,
};

const reducers = {
  SET_PRIVATE_KEY_HEX(state: NostrState, action: { privateKeyHex: string | null }) {
    const privateKey = action.privateKeyHex
      ? hexToBytes(action.privateKeyHex)
      : null;

    return {
      ...state,
      privateKeyHex: action.privateKeyHex,
      privateKey,
      publicKeyHex: privateKey ? getPublicKey(privateKey) : null,
    };
  },
  SET_PRIVATE_KEY(state: NostrState, action: { privateKey: Uint8Array | null }) {
    return { ...state, privateKey: action.privateKey };
  },
  SET_PUBLIC_KEY_HEX(state: NostrState, action: { publicKeyHex: string | null }) {
    return { ...state, publicKeyHex: action.publicKeyHex };
  },
  SET_CONNECT_MODE(
    state: NostrState,
    action: { connectMode: 'nsec' | 'bunker' | 'nostr-connect' },
  ) {
    return { ...state, connectMode: action.connectMode };
  },
  SET_PROFILE(state: NostrState, action: { profile: NostrProfile | null }) {
    return { ...state, profile: action.profile };
  },
  SET_PROFILE_LOADING(state: NostrState, action: { loading: boolean }) {
    if (!state.profile) {
      return state;
    }
    return {
      ...state,
      profile: { ...state.profile, loading: action.loading },
    };
  },
  SET_NOSTR_PROFILE_URL(state: NostrState, action: { nostrProfileUrl: string }) {
    return { ...state, nostrProfileUrl: action.nostrProfileUrl };
  },
  SET_OPEN_HELP_PANEL(state: NostrState, action: { openHelpPanel: boolean }) {
    return { ...state, openHelpPanel: action.openHelpPanel };
  },
};

function setPrivateKey(privateKey: Uint8Array | null) {
  return makeAction(reducers, 'SET_PRIVATE_KEY', { privateKey });
}

function setPublicKeyHex(publicKeyHex: string | null) {
  return makeAction(reducers, 'SET_PUBLIC_KEY_HEX', { publicKeyHex   });
}

function setConnectMode(connectMode: 'nsec' | 'bunker' | 'nostr-connect') {
  return makeAction(reducers, 'SET_CONNECT_MODE', { connectMode });
}

function setProfile(profile: NostrProfile | null) {
  return makeAction(reducers, 'SET_PROFILE', { profile });
}

function setProfileLoading(loading: boolean) {
  return makeAction(reducers, 'SET_PROFILE_LOADING', { loading });
}

function setOpenHelpPanel(openHelpPanel: boolean) {
  return makeAction(reducers, 'SET_OPEN_HELP_PANEL', { openHelpPanel });
}

function getPublicKeyHex(state: NostrState) {
  return state.publicKeyHex;
}

function getPrivateKey(state: NostrState) {
  return state.privateKey;
}

function getConnectMode(state: NostrState) {
  return state.connectMode;
}

function getNostrProfile(state: NostrState) {
  return state.profile;
}

function isNostrLoggedIn(state: NostrState) {
  return state.profile?.publicKeyHex !== null;
}

function isProfileLoading(state: NostrState) {
  return state.profile?.loading ?? false;
}

function getNostrProfileUrl(state: NostrState) {
  return state.nostrProfileUrl;
}

function getNostrSearchUrl(state: NostrState) {
  return state.nostrSearchUrl;
}

function getNostrEventUrl(state: NostrState) {
  return state.nostrEventUrl;
}

function getOpenHelpPanel(state: NostrState) {
  return state.openHelpPanel;
}

export const nostrModule = createStoreModule(initialState, {
  namespace: 'nostr',
  reducers,
  actionCreators: {
    setPrivateKey,
    setPublicKeyHex,
    setConnectMode,
    setProfile,
    setProfileLoading,
    setOpenHelpPanel,
  },
  selectors: {
    getPrivateKey,
    getPublicKeyHex,
    getConnectMode,
    getNostrProfile,
    isNostrLoggedIn,
    isProfileLoading,
    getNostrProfileUrl,
    getNostrEventUrl,
    getNostrSearchUrl,
    getOpenHelpPanel,
  },
});
