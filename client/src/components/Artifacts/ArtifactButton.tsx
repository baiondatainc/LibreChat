import { useEffect, useRef, useState } from 'react';
import debounce from 'lodash/debounce';
import { useLocation } from 'react-router-dom';
import * as Tabs from '@radix-ui/react-tabs';
import { useRecoilState, useSetRecoilState, useResetRecoilState } from 'recoil';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import type { Artifact } from '~/common';
import { ArtifactPreview } from './ArtifactPreview';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useGetStartupConfig } from '~/data-provider';
import { cn, logger, isArtifactRoute } from '~/utils';
import store from '~/store';

const ArtifactButton = ({ artifact }: { artifact: Artifact | null }) => {
  const location = useLocation();
  const setVisible = useSetRecoilState(store.artifactsVisibility);
  const [artifacts, setArtifacts] = useRecoilState(store.artifactsState);
  const [currentArtifactId, setCurrentArtifactId] = useRecoilState(store.currentArtifactId);
  const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);
  const [visibleArtifacts, setVisibleArtifacts] = useRecoilState(store.visibleArtifacts);
  const previewRef = useRef<SandpackPreviewRef>();
  const { data: startupConfig } = useGetStartupConfig();
  const [expanded, setExpanded] = useState(false);

  const debouncedSetVisibleRef = useRef(
    debounce((artifactToSet: Artifact) => {
      logger.log(
        'artifacts_visibility',
        'Setting artifact to visible state from Artifact button',
        artifactToSet,
      );
      setVisibleArtifacts((prev) => ({
        ...prev,
        [artifactToSet.id]: artifactToSet,
      }));
    }, 750),
  );

  useEffect(() => {
    if (artifact == null || artifact?.id == null || artifact.id === '') {
      return;
    }
    if (!isArtifactRoute(location.pathname)) {
      return;
    }
    const debouncedSetVisible = debouncedSetVisibleRef.current;
    debouncedSetVisible(artifact);
    return () => {
      debouncedSetVisible.cancel();
    };
  }, [artifact, location.pathname]);

  // Register artifact in store so version tracking still works
  useEffect(() => {
    if (artifact == null || artifact?.id == null || artifact.id === '') {
      return;
    }
    setCurrentArtifactId(artifact.id);
    if (artifacts?.[artifact.id] == null) {
      setArtifacts(visibleArtifacts);
    }
  }, [artifact?.id]); // eslint-disable-line

  if (artifact === null || artifact === undefined) {
    return null;
  }

  // ── Inline renderer ───────────────────────────────────────────────────────
  return (
    <InlineArtifact
      artifact={artifact}
      previewRef={previewRef as React.MutableRefObject<SandpackPreviewRef>}
      startupConfig={startupConfig}
      expanded={expanded}
      setExpanded={setExpanded}
    />
  );
};

// ── Separate component so hooks (useArtifactProps) are always called ─────────
function InlineArtifact({
  artifact,
  previewRef,
  startupConfig,
  expanded,
  setExpanded,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
  startupConfig: any;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const { files, fileKey, template, sharedProps } = useArtifactProps({ artifact });

  return (
    <Tabs.Root value="preview">
      <div
        className={cn(
          'my-4 w-full overflow-hidden rounded-xl',
          'border border-border-light bg-surface-primary shadow-sm',
          'transition-all duration-300',
        )}
      >
        {/* ── Header bar ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-border-light bg-surface-primary-alt px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Brand dot — green-500 = Malafi teal / RP cyan */}
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium text-text-secondary truncate max-w-[360px]">
              {artifact.title}
            </span>
          </div>
          {/* Expand / collapse toggle */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="rounded px-2 py-0.5 text-xs text-text-tertiary hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            {expanded ? '↑ collapse' : '↓ expand'}
          </button>
        </div>

        {/* ── Sandpack preview — rendered inline, no click needed ─────────── */}
        <Tabs.Content
          value="preview"
          className={cn(
            'w-full overflow-hidden transition-all duration-300',
            expanded ? 'h-[600px]' : 'h-[420px]',
          )}
        >
          <ArtifactPreview
            files={files}
            fileKey={fileKey}
            template={template}
            previewRef={previewRef}
            sharedProps={sharedProps}
            currentCode={undefined}
            startupConfig={startupConfig}
          />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  );
}

export default ArtifactButton;