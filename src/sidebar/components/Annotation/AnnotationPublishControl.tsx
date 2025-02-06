import { Button, CancelIcon } from '@hypothesis/frontend-shared';
import classnames from 'classnames';

import type { Group } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';

export type AnnotationPublishControlProps = {
  /** The group this annotation or draft would publish to */
  group: Group;

  /**
   * Should the save button be disabled? Hint: it will be if the annotation has
   * no content
   */
  isDisabled?: boolean;

  /** Callback for cancel button click */
  onCancel: () => void;

  /** Callback for save button click */
  onSave: () => void;

  // Injected
  settings: SidebarSettings;
};

/**
 * Render a compound control button for publishing (saving) an annotation:
 * - Save the annotation — left side of button
 * - Choose sharing/privacy option - drop-down menu on right side of button
 *
 * @param {AnnotationPublishControlProps} props
 */
function AnnotationPublishControl({
  group,
  isDisabled,
  onCancel,
  onSave,
  settings,
}: AnnotationPublishControlProps) {
  const buttonStyle = applyTheme(
    ['ctaTextColor', 'ctaBackgroundColor'],
    settings,
  );

  return (
    <div className="flex flex-row gap-x-3">
      <div className="flex relative">
        <Button
          classes={classnames('rounded')}
          data-testid="publish-control-button"
          style={buttonStyle}
          onClick={onSave}
          disabled={isDisabled}
          size="lg"
          variant="primary"
        >
          Post to {group.name}
        </Button>
      </div>
      <div>
        <Button data-testid="cancel-button" onClick={onCancel} size="lg">
          <CancelIcon />
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default withServices(AnnotationPublishControl, ['settings']);
