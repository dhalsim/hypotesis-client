import {
  IconButton,
  FlagIcon,
  FlagFilledIcon,
  ReplyIcon,
} from '@hypothesis/frontend-shared';

import { useSidebarStore } from '../../store';
import { annotationSharingLink } from '../../helpers/annotation-sharing';
import { withServices } from '../../service-context';
import type { SavedAnnotation } from '../../../types/api';
import type { AnnotationsService } from '../../services/annotations';
import type { ToastMessengerService } from '../../services/toast-messenger';

import AnnotationShareControl from './AnnotationShareControl';

export type AnnotationActionBarProps = {
  annotation: SavedAnnotation;
  onReply: () => void;

  // injected
  annotationsService: AnnotationsService;
  toastMessenger: ToastMessengerService;
};

/**
 * A collection of buttons in the footer area of an annotation that take
 * actions on the annotation.
 *
 * @param {AnnotationActionBarProps} props
 */
function AnnotationActionBar({
  annotation,
  annotationsService,
  onReply,
  toastMessenger,
}: AnnotationActionBarProps) {
  const store = useSidebarStore();
  const userProfile = store.getNostrProfile();
  const isLoggedIn = userProfile !== null;

  const shareLink = annotationSharingLink(annotation);
  const showFlagButton = !annotation.flagged 
    && isLoggedIn 
    && annotation.user !== userProfile?.publicKeyHex;

  const onFlag = () => {
    annotationsService
      .flag(annotation)
      .catch(() => toastMessenger.error('Flagging annotation failed'));
  };

  const onReplyClick = () => {
    if (!isLoggedIn) {
      store.openSidebarPanel('nostrConnectPanel');
      
      return;
    }
    
    onReply();
  };

  return (
    <div className="flex text-[16px]" data-testid="annotation-action-bar">
      <IconButton icon={ReplyIcon} title="Reply" onClick={onReplyClick} />
      {shareLink && (
        <AnnotationShareControl annotation={annotation} shareUri={shareLink} />
      )}
      {showFlagButton &&  (
        <IconButton
          icon={FlagIcon}
          title="Report this annotation to moderators"
          onClick={onFlag}
        />
      )}
      {annotation.flagged && (
        <IconButton
          pressed={true}
          icon={FlagFilledIcon}
          title="Annotation has been reported"
        />
      )}
    </div>
  );
}

export default withServices(AnnotationActionBar, [
  'annotationsService',
  'toastMessenger',
]);
