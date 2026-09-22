import { AppHeader } from "../components/layout/AppHeader";
import { WorkspaceShell } from "../components/layout/WorkspaceShell";

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to earthquake browser
      </a>
      <AppHeader />
      <WorkspaceShell />
    </div>
  );
}
