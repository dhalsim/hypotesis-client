import { Button } from '@hypothesis/frontend-shared';
import { useEffect, useState } from 'preact/hooks';

import { withServices } from '../../service-context';
import { useSidebarStore } from '../../store';
import type { NostrRelaysService } from '../../services/nostr-relays';
import type { RelayMap, RelaySettings } from '../../store/modules/nostr-relays';

type LocalRelaysTabProps = {
  isOpen: boolean;
  onClose: () => void;
  nostrRelays: NostrRelaysService;
};

function LocalRelaysTab({
  isOpen,
  onClose,
  nostrRelays,
}: LocalRelaysTabProps) {
  const store = useSidebarStore();
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [forWrite, setForWrite] = useState(true);
  const [forRead, setForRead] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [localRelays, setLocalRelays] = useState<RelayMap>(store.getLocalRelays());

  useEffect(() => {
    setLocalRelays(store.getLocalRelays());
  }, [store]);
  
  if (!isOpen) {
    return null;
  }

  const handleAddRelay = () => {
    if (!newRelayUrl) {
      setError("Please enter a valid relay URL");
      
      return;
    }

    try {
      setError(null);

      const pubkey = store.getNostrProfile()?.publicKeyHex;

      if (!pubkey) {
        setError("Please login to add a relay");

        return;
      }
      
      nostrRelays.insertOrUpdateLocalRelay({
        pubkey,
        relay: newRelayUrl,
        isEnabled: isEnabled,
        forWrite: forWrite,
        forRead: forRead,
      });
      
      setNewRelayUrl('');
    } catch (err) {
      console.error('Failed to add relay:', err);
      
      setError('Failed to add relay. Please check the URL and try again.');
    }
  };

  const handleRelayChange = (relay: string, field: keyof RelaySettings, value: boolean) => {
    const updatedRelays = {
      ...localRelays,
      [relay]: {
        ...localRelays[relay],
        [field]: value,
      },
    };
    
    setLocalRelays(updatedRelays);
    
    store.setLocalRelay({ 
      relay, 
      settings: updatedRelays[relay] 
    });
  };

  const handleRelayUrlChange = (oldUrl: string, newUrl: string) => {
    const settings = localRelays[oldUrl];
    
    const updatedRelays = { ...localRelays };
    
    delete updatedRelays[oldUrl];
    
    updatedRelays[newUrl] = settings;
    
    setLocalRelays(updatedRelays);
    
    store.setLocalRelay({ 
      relay: newUrl, 
      settings: settings 
    });
  };

  const handleSaveRelays = () => {
    try {
      nostrRelays.updateLocalRelays(localRelays);
    } catch (err) {
      console.error('Failed to save relays:', err);
      setError('Failed to save relays. Please try again.');
    }
  };

  return (
    <div className="p-4">
      <p className="text-color-text-light mb-4">
        Add Nostr relays to connect to the network. These relays will be used to publish
        and retrieve or both.
      </p>

      <div className="relay-grid grid gap-2 mb-4">
        {Object.entries(localRelays).map(([relay, settings]) => (
          <div key={relay} className="grid grid-cols-5 gap-2 items-center">
            <input
              type="text"
              className="border rounded p-2"
              value={relay}
              onChange={e => handleRelayUrlChange(relay, e.currentTarget.value)}
            />
            
            <div className="simple-tooltip" data-tooltip-text="Enable this relay">
              <input
                type="checkbox"
                checked={settings.isEnabled}
                onChange={e => handleRelayChange(relay, 'isEnabled', e.currentTarget.checked)}
              />
            </div>

            <div className="simple-tooltip" data-tooltip-text="Enable read">
              <input
                type="checkbox"
                checked={settings.forRead}
                onChange={e => handleRelayChange(relay, 'forRead', e.currentTarget.checked)}
              />
            </div>

            <div className="simple-tooltip" data-tooltip-text="Enable write">
              <input
                type="checkbox"
                checked={settings.forWrite}
                onChange={e => handleRelayChange(relay, 'forWrite', e.currentTarget.checked)}
              />
            </div>

            <Button
              onClick={() => {
                const updatedRelays = { ...localRelays };
                delete updatedRelays[relay];
                setLocalRelays(updatedRelays);
              }}
              variant="custom"
            >
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          className="w-full border rounded p-2 pr-10"
          placeholder="wss://..."
          aria-label="Relay URL"
          value={newRelayUrl}
          onInput={e => setNewRelayUrl(e.currentTarget.value)}
        />

        <input 
          type='checkbox' 
          className='absolute right-0 top-0' 
          onChange={e => setIsEnabled(e.currentTarget.checked)}
        />

        <input 
          type='checkbox' 
          className='absolute right-0 top-0' 
          onChange={e => setForWrite(e.currentTarget.checked)}
        />

        <input 
          type='checkbox' 
          className='absolute right-0 top-0' 
          onChange={e => setForRead(e.currentTarget.checked)}
        />

        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button onClick={handleSaveRelays}>
          Save Relays
        </Button>
        <Button 
          onClick={handleAddRelay}
          disabled={!newRelayUrl}
        >
          Add Relay
        </Button>
        <Button 
          onClick={onClose}
          variant="secondary"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export default withServices(LocalRelaysTab, ['nostrRelays']); 