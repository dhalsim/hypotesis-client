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
  bunkerUrl: string | null;
  bunkerSecret: Uint8Array | null;
  connectMode: 'nsec' | 'bunker' | 'nostr-connect';
  profile: NostrProfile | null;
  nostrProfileUrl: string;
  nostrSearchUrl: string;
  nostrEventUrl: string;
};

const initialState: NostrState = {
  privateKey: null,
  publicKeyHex: null,
  bunkerUrl: null,
  bunkerSecret: null,
  connectMode: 'nsec',
  profile: null,
  nostrProfileUrl: 'https://njump.me',
  nostrSearchUrl: 'https://nostr.band/?q=',
  nostrEventUrl: 'https://njump.me',
};

const reducers = {
  SET_PRIVATE_KEY(state: NostrState, action: { privateKey: Uint8Array | null }) {

    return {
      ...state,
      privateKey: action.privateKey,
      publicKeyHex: action.privateKey 
        ? getPublicKey(action.privateKey) 
        : null,
    };
  },
  SET_PUBLIC_KEY_HEX(state: NostrState, action: { publicKeyHex: string | null }) {
    return { ...state, publicKeyHex: action.publicKeyHex };
  },
  SET_BUNKER_URL(state: NostrState, action: { bunkerUrl: string | null }) {
    return { ...state, bunkerUrl: action.bunkerUrl };
  },
  SET_BUNKER_SECRET(state: NostrState, action: { bunkerSecret: Uint8Array | null }) {
    return { ...state, bunkerSecret: action.bunkerSecret };
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
  LOAD_STATE(state: NostrState, action: { state: NostrState }) {
    return { ...state, ...action.state };
  },
};

function loadState(state: NostrState) {
  return makeAction(reducers, 'LOAD_STATE', { state });
}

function setPrivateKey(privateKey: Uint8Array | null) {
  return makeAction(reducers, 'SET_PRIVATE_KEY', { privateKey });
}

function setPublicKeyHex(publicKeyHex: string | null) {
  return makeAction(reducers, 'SET_PUBLIC_KEY_HEX', { publicKeyHex });
}

function setBunkerUrl(bunkerUrl: string | null) {
  return makeAction(reducers, 'SET_BUNKER_URL', { bunkerUrl });
}

function setBunkerSecret(bunkerSecret: Uint8Array | null) {
  return makeAction(reducers, 'SET_BUNKER_SECRET', { bunkerSecret });
}

function setConnectMode(connectMode: 'nsec' | 'bunker' | 'nostr-connect') {
  return makeAction(reducers, 'SET_CONNECT_MODE', { connectMode });
}

function setNostrProfile(profile: NostrProfile | null) {
  return makeAction(reducers, 'SET_PROFILE', { profile });
}

function setProfileLoading(loading: boolean) {
  return makeAction(reducers, 'SET_PROFILE_LOADING', { loading });
}

function getPublicKeyHex(state: NostrState) {
  return state.publicKeyHex;
}

function getPrivateKey(state: NostrState) {
  return state.privateKey;
}

function getBunkerUrl(state: NostrState) {
  return state.bunkerUrl;
}

function getBunkerSecret(state: NostrState) {
  return state.bunkerSecret;
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


export const nostrModule = createStoreModule(initialState, {
  namespace: 'nostr',
  reducers,
  actionCreators: {
    loadState,
    setPrivateKey,
    setPublicKeyHex, 
    setBunkerUrl,
    setBunkerSecret,
    setConnectMode,
    setNostrProfile,
    setProfileLoading,
  },
  selectors: {
    getPrivateKey,
    getPublicKeyHex,
    getBunkerUrl,
    getBunkerSecret,
    getConnectMode,
    getNostrProfile,
    isNostrLoggedIn,
    isProfileLoading,
    getNostrProfileUrl,
    getNostrEventUrl,
    getNostrSearchUrl,
  },
});
