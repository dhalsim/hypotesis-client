import { ProfileIcon, Spinner } from '@hypothesis/frontend-shared';
import { useState } from 'preact/hooks';

import Menu from './Menu';
import MenuItem from './MenuItem';
import MenuSection from './MenuSection';

import { useSidebarStore } from '../store';
import { nostrProfileUrl } from '../helpers/nostr';
import type { SidebarSettings } from '../../types/config';

export type NostrUserMenuProps = {
  onNostrLogout: () => void;

  settings: SidebarSettings;
};

/**
 * A menu with Nostr user and account links.
 *
 * This menu will contain Nostr-specific items and functionality.
 */
export default function NostrUserMenu({ onNostrLogout, settings }: NostrUserMenuProps) {
  const store = useSidebarStore();
  const profile = store.getNostrProfile();
  const isLoading = store.isProfileLoading();
  const [isOpen, setOpen] = useState(false);

  // For now, using a placeholder display name
  const displayName = profile?.displayName ?? 'Nostr User';

  // Add this function to handle opening the NostrConnectPanel
  const openNostrConnectPanel = () => {
    store.toggleSidebarPanel('nostrConnectPanel');
    setOpen(false); // Close the menu after clicking
  };

  const openNostrProfile = () => {
    if (profile?.publicKeyHex) {
      const url = nostrProfileUrl({ settings, store, pubkey: profile.publicKeyHex });
      
      window.open(url, '_blank');
    }
  };

  const menuLabel = (
    <span className="p-1">
      {
        profile?.picture 
          ? <img src={profile.picture} alt="Profile" width={20} height={20} /> 
          : <ProfileIcon />
      }
    </span>
  );

  return (
    <>
      {isLoading && <Spinner />}
      {!isLoading && (
        <Menu
          label={menuLabel}
          title={displayName}
          align="right"
          open={isOpen}
          onOpenChanged={setOpen}
        >
          <MenuSection>
            <MenuItem label={displayName} isDisabled={false} onClick={openNostrProfile} />
            <MenuItem label="Nostr settings" onClick={openNostrConnectPanel} />
          </MenuSection>
          <MenuSection>
            <MenuItem label="Log out" onClick={onNostrLogout} />
          </MenuSection>
        </Menu>
      )}
    </>
  );
}
