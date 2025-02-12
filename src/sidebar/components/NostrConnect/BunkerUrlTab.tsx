import { Button } from '@hypothesis/frontend-shared';
import { useEffect, useRef, useState } from 'preact/hooks';

import { withServices } from '../../service-context';
import type { NostrSettingsService } from '../../services/nostr-settings';

type BunkerUrlTabProps = {
  isOpen: boolean;
  bunkerUrl: string | null;
  onClose: () => void;
  nostrSettingsService: NostrSettingsService;
};

function BunkerUrlTab({ 
  isOpen,
  bunkerUrl, 
  onClose, 
  nostrSettingsService 
}: BunkerUrlTabProps) {
  const bunkerUrlRef = useRef<HTMLInputElement>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState(bunkerUrl || '');

  useEffect(() => {
    if (isOpen && bunkerUrl) {
      setInputValue(bunkerUrl);
    }
  }, [isOpen, bunkerUrl]);

  const handleSaveAndConnect = async () => {
    if (!inputValue) {
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      
      await nostrSettingsService.setBunkerUrl(inputValue);
      
      onClose();
    } catch (err) {      
      console.error('Failed to connect:', err);
      
      setError('Failed to connect. Please check your Bunker URL and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-4">
      <p className="text-color-text-light mb-4">
        Generate a Bunker URL using a remote signer like Amber (Android), Nostrify
        (iOS), or nsec.app (Web). Then paste it here.
      </p>
      <div className="relative mb-4">
        <input
          ref={bunkerUrlRef}
          type="text"
          className="w-full border rounded p-2 pr-10"
          placeholder="bunker://..."
          aria-label="Bunker URL"
          value={inputValue}
          onInput={e => setInputValue(e.currentTarget.value)}
        />
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>
      <div className="flex gap-2 justify-end">
        <Button 
          onClick={handleSaveAndConnect} 
          disabled={isConnecting || !inputValue}
        >
          {isConnecting ? 'Connecting...' : 'Save & Connect'}
        </Button>
      </div>
    </div>
  );
}

export default withServices(BunkerUrlTab, ['nostrSettingsService']); 
