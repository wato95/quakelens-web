import { useCallback, useState } from "react";

import { AppHeader } from "../components/layout/AppHeader";
import { WorkspaceShell } from "../components/layout/WorkspaceShell";
import type { PreviewManifest } from "../data/types";
import type { PreviewSessionFactory } from "./usePreviewEvents";

type AppProps = {
  createSession?: PreviewSessionFactory;
};

export function App({ createSession }: AppProps) {
  const [manifest, setManifest] = useState<PreviewManifest | null>(null);
  const handleManifestReady = useCallback((nextManifest: PreviewManifest | null) => {
    setManifest(nextManifest);
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to earthquake browser
      </a>
      <AppHeader coverage={manifest?.includedCoverage ?? null} />
      <WorkspaceShell
        createSession={createSession}
        onManifestReady={handleManifestReady}
      />
    </div>
  );
}
