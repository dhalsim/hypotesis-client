import { Card, Tab } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { useId, useState } from 'preact/hooks';

import { useSidebarStore } from '../../store';
import { withServices } from '../../service-context';
import type { NostrSettingsService } from '../../services/nostr-settings';
// import type { NostrState } from '../../store/modules/nostr';

import SidebarPanel from '../SidebarPanel';
import TabHeader from '../tabs/TabHeader';
import TabPanel from '../tabs/TabPanel';
import LocalRelaysTab from './LocalRelaysTab';

type NostrConnectPanelProps = {
  onClose: () => void;
  nostrSettingsService: NostrSettingsService;
};

type PanelKey = 'local' | 'remote';

function NostrRelaysPanel({
  onClose
}: NostrConnectPanelProps) {
  const store = useSidebarStore();
  const isOpen = store.isSidebarPanelOpen('nostrRelaysPanel');
  const [activeSubPanel, setActiveSubPanel] = useState<PanelKey>(
    'local'
  );
  
  const relaysTabId = useId();
  const relaysPanelId = useId();

  if (!isOpen) {
    return null;
  }

  return (
    <SidebarPanel
      title="Nostr Relays"
      panelName="nostrRelaysPanel"
      onActiveChanged={active => !active && onClose()}
      variant="custom"
    >
      <TabHeader closeTitle="Close Nostr Connect panel" onClose={onClose}>
        <Tab
          id={relaysTabId}
          aria-controls={relaysPanelId}
          variant="tab"
          textContent="Relays"
          selected={activeSubPanel === 'local'}
          onClick={() => setActiveSubPanel('local')}
        >
          Local Relays
        </Tab>
        <Tab
          id={relaysTabId}
          aria-controls={relaysPanelId}
          variant="tab"
          textContent="Remote Relays"
          selected={activeSubPanel === 'remote'}
          onClick={() => setActiveSubPanel('remote')}
        >
          Remote Relays
        </Tab>
      </TabHeader>
      <Card
        classes={classnames({
          'rounded-tl-none': activeSubPanel === 'local',
        })}
      >
        <div className="border-b">
          <TabPanel
            id={relaysPanelId}
            aria-labelledby={relaysTabId}
            active={activeSubPanel === 'local'}
            title="Manage Relays"
          >
            <LocalRelaysTab
              isOpen={activeSubPanel === 'local'}
              onClose={onClose}
            />
          </TabPanel>
        </div>
      </Card>
      <Card
        classes={classnames({
          'rounded-tl-none': activeSubPanel === 'remote',
        })}
      >
        <div className="border-b">
          <TabPanel
            id={relaysPanelId}
            aria-labelledby={relaysTabId}
            active={activeSubPanel === 'remote'}
            title="Manage Relays"
           />
        </div>
      </Card>
    </SidebarPanel>
  );
}

export default withServices(NostrRelaysPanel, ['nostrSettingsService']);