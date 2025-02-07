import {
  Link,
  AnnotateIcon,
  HighlightIcon,
  ReplyIcon,
} from '@hypothesis/frontend-shared';
import type { IconComponent } from '@hypothesis/frontend-shared/lib/types';
import classnames from 'classnames';

import { withServices } from '../service-context';

type LabeledIconProps = {
  /** Name of the "command" the instruction represents */
  commandName: string;
  icon: IconComponent;
};

function LabeledIcon({ commandName, icon: Icon }: LabeledIconProps) {
  return (
    <span className="whitespace-nowrap" data-testid="instruction">
      <Icon
        className={classnames(
          'w-em h-em',
          'mx-1 -mt-1', // Give horizontal space; pull up top margin a little
          'text-color-text-light inline',
        )}
        // The icon is just a visual hint representing the command, but it
        // provides no extra information
        aria-hidden
      />
      <em data-testid="command-name">{commandName}</em>
    </span>
  );
}

/**
 * Tutorial for using the sidebar app
 * 
 * TODO: nostr: review this, add tutorial for groups
 */
function Tutorial() {
  return (
    <ol className="list-decimal pl-10 space-y-2">
      <li>
        To create an annotation, select text and then select the{' '}
        <LabeledIcon icon={AnnotateIcon} commandName="Annotate" /> button.
      </li>
      <li>
        To create a highlight (
        <Link
          href="https://web.hypothes.is/help/why-are-highlights-private-by-default/"
          target="_blank"
          underline="always"
        >
          visible only to you
        </Link>
        ), select text and then select the{' '}
        <LabeledIcon icon={HighlightIcon} commandName="Highlight" /> button.
      </li>
      <li>
        To reply to an annotation, select the{' '}
        <LabeledIcon icon={ReplyIcon} commandName="Reply" /> button.
      </li>
    </ol>
  );
}

export default withServices(Tutorial, ['settings']);
