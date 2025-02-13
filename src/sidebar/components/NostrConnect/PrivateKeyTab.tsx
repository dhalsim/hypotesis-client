import { Button } from '@hypothesis/frontend-shared';
import { nip19 } from 'nostr-tools';
import { useRef, useState, useEffect } from 'preact/hooks';
import { bytesToHex } from '@noble/hashes/utils';

import { withServices } from '../../service-context';
import type { NostrSettingsService } from '../../services/nostr-settings';
import { useSidebarStore } from '../../store';

type PrivateKeyTabProps = {
  isOpen: boolean;
  onClose: () => void;
  nostrSettingsService: NostrSettingsService;
};

function PrivateKeyTab({
  isOpen,
  onClose,
  nostrSettingsService,
}: PrivateKeyTabProps) {
  const store = useSidebarStore();

  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(
    store.getPrivateKey()
  );
  
  const [privateKeyHex, setPrivateKeyHex] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const nsecRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && privateKey) {
      setPrivateKeyHex(bytesToHex(privateKey));
      
      const nsec = getEncodedNsec(privateKey);
      
      if (nsec && nsecRef.current) {
        nsecRef.current.value = nsec;
      }
    }
  }, [isOpen, privateKey]);

  const handleDecoding = () => {
    try {
      if (nsecRef.current?.value) {
        const decoded = nip19.decode(nsecRef.current.value);
        
        if (decoded.type === 'nsec') {
          setPrivateKey(decoded.data);
          
          setError(null);
        }
      }
    } catch (err) {
      setError('Invalid private key format');
      
      console.error('Failed to decode private key:', err);
    }
  };

  const handleSaveAndConnect = async () => {
    if (!privateKey) {
      setError('Please enter a valid private key');
      
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      nostrSettingsService.setPrivateKey(privateKey);
      
      onClose();
    } catch (err) {
      console.error('Failed to connect:', err);
      
      setError('Failed to connect. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const getEncodedNsec = (privateKey: Uint8Array): string | null => {
    try {
      return nip19.nsecEncode(privateKey);
    } catch (err) {
      console.error('Failed to encode private key:', err);
      return null;
    }
  };

  return (
    <div className="p-4">
      {error && (
        <p className="text-red-600 mb-4" role="alert">
          {error}
        </p>
      )}
      <input type="hidden" value={privateKeyHex ?? ''} />
      <p className="text-color-text-light mb-4">
        Paste your Nostr private key in nsec format to connect.
      </p>
      <div className="relative mb-4">
        <input
          ref={nsecRef}
          type="password"
          className="w-full border rounded p-2 pr-10"
          placeholder="nsec1..."
          aria-label="Private key"
          onChange={handleDecoding}
        />
      </div>

      <p className="text-color-text-light mb-4">
        You can generate a new Nostr private key and a profile via
        <a href="https://start.njump.me/" target="_blank" rel="noopener noreferrer">
          https://start.njump.me/
        </a>
      </p>
      <p className="text-color-text-light mb-4">
        After creating one, copy the private key (nsec) and paste it here.
      </p>

      <div className="flex gap-2 justify-end">
        <Button onClick={handleSaveAndConnect} disabled={isConnecting || !privateKeyHex}>
          {isConnecting ? 'Connecting...' : 'Save & Connect'}
        </Button>
      </div>
    </div>
  );
}

export default withServices(PrivateKeyTab, ['nostrSettingsService']); 
