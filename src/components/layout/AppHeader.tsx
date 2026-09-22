import { StatusChip } from "../ui/StatusChip";

export function AppHeader() {
  return (
    <header className="app-header">
      <a className="app-brand" href="#main-content" aria-label="QuakeLens home">
        <svg className="app-brand__mark" viewBox="0 0 32 32" aria-hidden="true">
          <circle
            cx="16"
            cy="16"
            r="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 18h6l2.2-7 4.1 13 2.5-8H27"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <span className="app-brand__name">QuakeLens</span>
        <span className="app-brand__tagline">Earthquake observatory</span>
      </a>

      <nav className="app-nav" aria-label="Workspace sections">
        <a href="#map" aria-current="page">
          Map
        </a>
        <a href="#activity">Activity</a>
        <a href="#events">Events</a>
      </nav>

      <div className="app-header__meta">
        <span className="coverage-label">Coverage: 2026 preview</span>
        <StatusChip preview>Preview</StatusChip>
      </div>
    </header>
  );
}
