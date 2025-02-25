import classnames from 'classnames';
import { useCallback, useMemo, useRef, useState } from 'preact/hooks';
import type { Annotation } from '../../../types/api';

import type { SidebarSettings } from '../../../types/config';

import {
  annotationRole,
  isPageNote,
  isReply,
  isSaved,
} from '../../helpers/annotation-metadata';
import { applyTheme } from '../../helpers/theme';
import { withServices } from '../../service-context';
import { useSidebarStore } from '../../store';
import type { TagsService } from '../../services/tags';
import type { ToastMessengerService } from '../../services/toast-messenger';
import type { AnnotationsService } from '../../services/annotations';
import type { Draft } from '../../store/modules/drafts';

import TagEditor from '../TagEditor';
import AnnotationLicense from './AnnotationLicense';
import AnnotationPublishControl from './AnnotationPublishControl';
import TextArea from '../TextAreaEditor';

type AnnotationEditorProps = {
  /** The annotation under edit */
  annotation: Annotation;
  /** The annotation's draft */
  draft: Draft;

  // Injected
  annotationsService: AnnotationsService;
  settings: SidebarSettings;
  toastMessenger: ToastMessengerService;
  tags: TagsService;
};

/**
 * Display annotation content in an editable format.
 */
function AnnotationEditor({
  annotation,
  draft,
  annotationsService,
  settings,
  tags: tagsService,
  toastMessenger,
}: AnnotationEditorProps) {
  // Track the currently-entered text in the tag editor's input
  const [pendingTag, setPendingTag] = useState<string | null>(null);

  const store = useSidebarStore();
  const group = store.getGroup(annotation.group);
  const isReplyAnno = useMemo(() => isReply(annotation), [annotation]);
  const isPageNoteAnno = useMemo(() => isPageNote(annotation), [annotation]);

  const shouldShowLicense =
    !draft.isPrivate && group && group.type !== 'private';

  const tags = draft.tags;
  const text = draft.text;

  const onEditTags = useCallback(
    (tags: string[]) => {
      store.createDraft(draft.annotation, { ...draft, tags });
    },
    [draft, store],
  );

  const onAddTag = useCallback(
    /**
     * Verify `newTag` has content and is not a duplicate; add the tag
     *
     * @return `true` if tag was added to the draft; `false` if duplicate or
     * empty
     */
    (newTag: string) => {
      if (!newTag || tags.indexOf(newTag) >= 0) {
        // don't add empty or duplicate tags
        return false;
      }
      const tagList = [...tags, newTag];
      // Update the tag locally for the suggested-tag list
      tagsService.store(tagList);
      onEditTags(tagList);
      return true;
    },
    [onEditTags, tags, tagsService],
  );

  const onRemoveTag = useCallback(
    /**
     * Remove tag from draft if present.
     *
     * @return `true` if tag removed from draft, `false` if tag not found in
     * draft tags
     */
    (tag: string) => {
      const newTagList = [...tags]; // make a copy
      const index = newTagList.indexOf(tag);
      if (index >= 0) {
        newTagList.splice(index, 1);
        onEditTags(newTagList);
        return true;
      }
      return false;
    },
    [onEditTags, tags],
  );

  const onEditText = useCallback(
    (text: string) => {
      store.createDraft(draft.annotation, { ...draft, text });
    },
    [draft, store],
  );

  const onSave = async () => {
    // If there is any content in the tag editor input field that has
    // not been committed as a tag, go ahead and add it as a tag
    // See https://github.com/hypothesis/product-backlog/issues/1122
    if (pendingTag) {
      onAddTag(pendingTag);
    }
    const successMessage = `${annotationRole(annotation)} ${
      isSaved(annotation) ? 'updated' : 'saved'
    }`;
    try {
      await annotationsService.save(annotation);
      
      toastMessenger.success(successMessage, { visuallyHidden: true });
    } catch (error) {
      console.error(error);
      
      toastMessenger.error('Saving annotation failed');
    }
  };

  // Revert changes to this annotation
  const onCancel = useCallback(() => {
    store.removeDraft(annotation);
    if (!isSaved(annotation)) {
      store.removeAnnotations([annotation]);
    }
  }, [annotation, store]);

  // Allow saving of annotation by pressing CMD/CTRL-Enter
  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key;

    if ((event.metaKey || event.ctrlKey) && key === 'Enter') {
      event.stopPropagation();
      event.preventDefault();
      void onSave();
    }
  };

  const textStyle = applyTheme(['annotationFontFamily'], settings);

  const label = 'Enter reply';
  // The input element where the user inputs their comment.
  const input = useRef<HTMLTextAreaElement>(null);

  return (
    /* eslint-disable-next-line jsx-a11y/no-static-element-interactions */
    <div
      data-testid="annotation-editor"
      className="space-y-4"
      onKeyDown={onKeyDown}
    >
      {(isReplyAnno || isPageNoteAnno) && (
        <TextArea
          aria-label={label}
          placeholder={label}
          dir="auto"
          classes={classnames(
            'w-full min-h-[8em] resize-y',
            // Turn off border-radius on top edges to align with toolbar above
            'rounded-t-none',
            // Larger font on touch devices
            'text-base touch:text-touch-base',
          )}
          containerRef={input}
          onKeyDown={onKeyDown}
          onEditText={onEditText}
          value={text}
          style={textStyle}
        />
      )}
      <TagEditor
        onAddTag={onAddTag}
        onRemoveTag={onRemoveTag}
        onTagInput={setPendingTag}
        tagList={tags}
      />
      {group && (
        <AnnotationPublishControl
          group={group}
          onCancel={onCancel}
          onSave={onSave}
        />
      )}
      {shouldShowLicense && <AnnotationLicense />}
    </div>
  );
}

export default withServices(AnnotationEditor, [
  'annotationsService',
  'settings',
  'tags',
  'toastMessenger',
]);
