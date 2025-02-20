import { createStoreModule, makeAction } from "../create-store";

export type RelaySettings = {
  isEnabled: boolean;
  forWrite: boolean;
  forRead: boolean;
}

export type RelayMap = {
  [key: string]: RelaySettings;
}

type NostrRelaysState = {
  localRelays: RelayMap;
  remoteRelays: RelayMap;
}

export type RelayType = 'local' | 'remote';

const initialState: NostrRelaysState = {
  localRelays: {},
  remoteRelays: {},
};

const reducers = {
  SET_LOCAL_RELAY(state: NostrRelaysState, action: { relay: string; settings: RelaySettings }) {
    return {
      ...state,
      localRelays: {
        ...state.localRelays,
        [action.relay]: action.settings,
      },
    };
  },
  SET_REMOTE_RELAY(state: NostrRelaysState, action: { relay: string; settings: RelaySettings }) {
    return {
      ...state,
      remoteRelays: {
        ...state.remoteRelays,
        [action.relay]: action.settings,
      },
    };
  },
};

function setLocalRelay({ relay, settings }: { relay: string; settings: RelaySettings }) {
  return makeAction(
    reducers, 
    'SET_LOCAL_RELAY', 
    { relay, settings }
  );
}

function setRemoteRelay({ relay, settings }: { relay: string; settings: RelaySettings }) {
  return makeAction(
    reducers, 
    'SET_REMOTE_RELAY', 
    { relay, settings }
  );
}

function getRelaySettings(state: NostrRelaysState, action: { type: RelayType; relay: string }) {
  return state[action.type === 'local' ? 'localRelays' : 'remoteRelays'][action.relay];
}

function getLocalRelays(state: NostrRelaysState) {
  return state.localRelays;
}

function getRemoteRelays(state: NostrRelaysState) {
  return state.remoteRelays;
}

export const nostrRelaysModule = createStoreModule(initialState, {
  namespace: 'nostr-relays',
  reducers,
  actionCreators: {
    setLocalRelay,
    setRemoteRelay,
  },
  selectors: {
    getRelaySettings,
    getLocalRelays,
    getRemoteRelays,
  },
});
