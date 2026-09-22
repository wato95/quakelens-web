import { AppHeader } from "../components/layout/AppHeader";
import { WorkspaceShell } from "../components/layout/WorkspaceShell";
import type { PreviewSessionFactory } from "./usePreviewEvents";

type AppProps = {
  createSession?: PreviewSessionFactory;
};

export function App({ createSession }: AppProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to earthquake browser
      </a>
      <AppHeader />
      <WorkspaceShell createSession={createSession} />
    </div>
  );
}
