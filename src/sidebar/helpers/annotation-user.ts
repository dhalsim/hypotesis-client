import { nip19 } from 'nostr-tools';

import type { Annotation } from '../../types/api';

export function annotationNostrDisplayName(
  annotation: Pick<Annotation, 'user' | 'user_info'>,
): string {
  if (annotation.user_info?.display_name) {
    return annotation.user_info.display_name;
  }
  
  const npub = nip19.npubEncode(annotation.user);

  return npub.slice(0, 5) + ':' + npub.slice(-5);
}
