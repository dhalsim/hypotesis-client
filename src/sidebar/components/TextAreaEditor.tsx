import classnames from "classnames";
import type { Ref, JSX } from "preact";
import { useSyncedRef } from "@hypothesis/frontend-shared";

type TextAreaProps = {
  classes?: string;
  containerRef?: Ref<HTMLTextAreaElement>;
  onEditText: (text: string) => void;
};

export default function TextArea({
  classes,
  containerRef,
  onEditText,
  onKeyDown,
  ...restProps
}: TextAreaProps & JSX.TextareaHTMLAttributes) {
  const textareaRef = useSyncedRef(containerRef);

  return (
    <div className="relative">
      <textarea
        className={classnames(
          'border rounded p-2',
          'text-color-text-light bg-grey-0',
          'focus:bg-white focus:outline-none focus:shadow-focus-inner',
          classes,
        )}
        onInput={(e: Event) => onEditText((e.target as HTMLInputElement).value)}
        {...restProps}
        onKeyDown={onKeyDown}
        ref={textareaRef}
      />
    </div>
  );
}
