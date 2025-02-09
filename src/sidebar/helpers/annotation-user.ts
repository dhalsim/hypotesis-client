import type { Annotation } from '../../types/api';

import { nostrDisplayName } from './nostr';

export function annotationNostrDisplayName(
  annotation: Pick<Annotation, 'user' | 'user_info'>,
): string {
  const displayName = annotation.user_info?.display_name;
  
  return nostrDisplayName(annotation.user, displayName);
}
