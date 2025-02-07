import { Card } from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../../store';
import SidebarPanel from '../SidebarPanel';
import ShareAnnotations from './ShareAnnotations';
/**
 * Panel with sharing options.
 * - If provided tabs include `export` or `import`, will show a tabbed interface
 * - Else, shows a single "Share annotations" interface
 */
export default function ShareDialog() {
  const store = useSidebarStore();
  const focusedGroup = store.focusedGroup();
  const groupName = (focusedGroup && focusedGroup.name) || '...';
  const panelTitle = `Share Annotations in ${groupName}`;

  return (
    <SidebarPanel
      title={panelTitle}
      panelName="shareGroupAnnotations"
      variant="custom"
    >
      <Card>
        <ShareAnnotations />
      </Card>
    </SidebarPanel>
  );
}
