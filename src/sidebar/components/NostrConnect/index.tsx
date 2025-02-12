import { Card, Tab } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useId, useState } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import { withServices } from '../../service-context';
import type { NostrSettingsService } from '../../services/nostr-settings';
import type { NostrState } from '../../store/modules/nostr';

import SidebarPanel from '../SidebarPanel';
import TabHeader from '../tabs/TabHeader';
import TabPanel from '../tabs/TabPanel';
import PrivateKeyTab from './PrivateKeyTab';
import BunkerUrlTab from './BunkerUrlTab';

type NostrConnectPanelProps = {
  onClose: () => void;
  nostrSettingsService: NostrSettingsService;
};

type PanelKey = NostrState['connectMode'];

function NostrConnectPanel({
  onClose
}: NostrConnectPanelProps) {
  const store = useSidebarStore();
  const isOpen = store.isSidebarPanelOpen('nostrConnectPanel');
  const [activeSubPanel, setActiveSubPanel] = useState<PanelKey>(
    store.getConnectMode() || 'nsec'
  );
  
  const privateKeyTabId = useId();
  const privateKeyPanelId = useId();
  const remoteSignerTabId = useId();
  const remoteSignerPanelId = useId();

  if (!isOpen) {
    return null;
  }

  return (
    <SidebarPanel
      title="Connect to Nostr"
      panelName="nostrConnectPanel"
      onActiveChanged={active => !active && onClose()}
      variant="custom"
    >
      <TabHeader closeTitle="Close Nostr Connect panel" onClose={onClose}>
        <Tab
          id={privateKeyTabId}
          aria-controls={privateKeyPanelId}
          variant="tab"
          textContent="Private Key"
          selected={activeSubPanel === 'nsec'}
          onClick={() => setActiveSubPanel('nsec')}
        >
          Private Key
        </Tab>
        <Tab
          id={remoteSignerTabId}
          aria-controls={remoteSignerPanelId}
          variant="tab"
          textContent="Remote Signer (Bunker)"
          selected={activeSubPanel === 'bunker'}
          onClick={() => setActiveSubPanel('bunker')}
        >
          Remote Signer
        </Tab>
      </TabHeader>
      <Card
        classes={classnames({
          'rounded-tl-none': activeSubPanel === 'nsec',
        })}
      >
        <div className="border-b">
          <TabPanel
            id={privateKeyPanelId}
            aria-labelledby={privateKeyTabId}
            active={activeSubPanel === 'nsec'}
            title="Connect with Private Key"
          >
            <PrivateKeyTab
              isOpen={activeSubPanel === 'nsec'}
              onClose={onClose}
            />
          </TabPanel>
          <TabPanel
            id={remoteSignerPanelId}
            aria-labelledby={remoteSignerTabId}
            active={activeSubPanel === 'bunker'}
            title="Connect with Bunker URL"
          >
            <BunkerUrlTab
              isOpen={activeSubPanel === 'bunker'}
              bunkerUrl={store.getBunkerUrl()}
              onClose={onClose}
            />
          </TabPanel>
        </div>
      </Card>
    </SidebarPanel>
  );
}

export default withServices(NostrConnectPanel, ['nostrSettingsService']);