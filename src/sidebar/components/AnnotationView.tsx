// TODO: nostr: review this file
import { useEffect, useState } from 'preact/hooks';

import { withServices } from '../service-context';
import { useSidebarStore } from '../store';
import SidebarContentError from './SidebarContentError';
import ThreadList from './ThreadList';
import { useRootThread } from './hooks/use-root-thread';

type AnnotationViewProps = {
  onLogin: () => void;
};

/**
 * The main content for the single annotation page (aka. https://hypothes.is/a/<annotation ID>)
 */
function AnnotationView({
  onLogin,
}: AnnotationViewProps) {
  const store = useSidebarStore();
  const annotationId = store.routeParams().id ?? '';
  const { rootThread } = useRootThread();

  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    setFetchError(false);
    store.clearAnnotations();

    // loadAnnotationsService
    //   .loadThread(annotationId)
    //   .then(annots => {
    //     const topLevelAnnot = annots.filter(
    //       ann => (ann.references || []).length === 0,
    //     )[0];

    //     if (!topLevelAnnot) {
    //       return;
    //     }

    //     annots.forEach(annot => annot.id && store.setExpanded(annot.id, true));

    //     if (topLevelAnnot.id !== annotationId) {
    //       store.highlightAnnotations([annotationId]);
    //     }
    //   })
    //   .catch(() => {
    //     setFetchError(true);
    //   });
  }, [
    annotationId,

    // Static dependencies.
    store,
  ]);

  return (
    <>
      {fetchError && (
        // This is the same error shown if a direct-linked annotation cannot
        // be fetched in the sidebar. Fortunately the error message makes sense
        // for this scenario as well.
        <SidebarContentError errorType="annotation" onLoginRequest={onLogin} />
      )}
      <ThreadList threads={rootThread.children} />
    </>
  );
}

export default withServices(AnnotationView, []);
