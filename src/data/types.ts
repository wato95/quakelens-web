export type CapabilityState =
  "available" | "captured_history" | "us_census_2024" | "not_in_preview";

export interface PreviewCapabilities {
  events: "available";
  revisions: "captured_history";
  places: "us_census_2024";
  tectonics: "not_in_preview";
  shaking: "not_in_preview";
  exposure: "not_in_preview";
}

export interface CoverageWindow {
  eventTimeStartInclusive: string;
  eventTimeEndExclusive: string;
  observedMinEventTime: string;
  observedMaxEventTime: string;
  annualPartition: number;
  acquisitionStatus: "complete";
  catalogueComplete: boolean;
  detailComplete: boolean;
}

export interface ExcludedPartition {
  eventTimeStartInclusive: string;
  eventTimeEndExclusive: string;
  state: "not_published";
  reason: string;
}

export type PreviewArtifactName = "events" | "revisions" | "daily_activity" | "places";

export interface PreviewArtifact {
  logicalName: PreviewArtifactName;
  relativePath: string;
  url: URL;
  contractVersion: string;
  rows: number;
  bytes: number;
  sha256: string;
  columns: ReadonlyArray<{ name: string; physicalType: string }>;
}

export interface SourceAttribution {
  sourceId: string;
  provider: string;
  attribution: string;
  sourceUrl: string;
  licenceId: string;
  redistributionNotes: string;
}

export interface LicenceAttribution {
  licenceId: string;
  name: string;
  licenceUrl: string;
  attributionRequirements: string;
  redistributionNotes: string;
}

export interface PreviewManifest {
  productKind: "quakelens-browser-preview";
  previewSchemaVersion: "1";
  previewBuildId: string;
  generatedAt: string;
  manifestUrl: URL;
  includedCoverage: CoverageWindow;
  excludedOrIncompletePartitions: ExcludedPartition[];
  capabilities: PreviewCapabilities;
  artifacts: Record<PreviewArtifactName, PreviewArtifact>;
  sources: SourceAttribution[];
  licences: LicenceAttribution[];
}

export interface EventFilters {
  startTimeInclusive?: string;
  endTimeExclusive?: string;
  minimumMagnitude?: number;
  maximumMagnitude?: number;
  minimumDepthKm?: number;
  maximumDepthKm?: number;
  eventType?: string;
  status?: string;
  reviewStatus?: string;
  placeQuery?: string;
  sortField?: EventSortField;
  sortDirection?: SortDirection;
  limit?: number;
}

export type EventSortField =
  "eventTime" | "magnitude" | "depthKm" | "place" | "eventType" | "status";

export type SortDirection = "asc" | "desc";

export interface EventFilterOptions {
  eventTypes: string[];
  statuses: string[];
  reviewStatuses: string[];
}

export interface EventSummary {
  eventId: string;
  eventRevisionId: string;
  eventTime: string;
  sourceUpdatedAt: string;
  magnitude: number;
  magnitudeType: string;
  longitude: number;
  latitude: number;
  depthKm: number;
  status: string;
  eventType: string;
  reviewStatus: string;
  placeDescription: string;
  capturedStateCount: number;
  sourceId: string;
  licenceId: string;
}

export type EventDetail = EventSummary;

export interface CapturedEventState extends Omit<EventSummary, "capturedStateCount"> {
  capturedStateNumber: number;
  isInitialState: boolean;
  changedFields: string[];
}

export interface DailyActivity {
  activityDateUtc: string;
  eventCount: number;
  maxMagnitude: number;
}

export interface ActivityRange {
  startDateInclusive?: string;
  endDateExclusive?: string;
}

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  placeType: string;
  countryCode: string;
  admin1Code: string;
  admin1Name: string | null;
  latitude: number;
  longitude: number;
  populationContext: number | null;
  populationYear: number | null;
  populationSourceId: string | null;
  sourceId: string;
  sourceVintage: string;
}

export interface EarthquakeRepository {
  getEvents(filters?: EventFilters): Promise<EventSummary[]>;
  getEvent(eventId: string): Promise<EventDetail | null>;
  getFilterOptions(): Promise<EventFilterOptions>;
}

export interface RevisionRepository {
  getRevisions(eventId: string): Promise<CapturedEventState[]>;
}

export interface ActivityRepository {
  getDailyActivity(range?: ActivityRange): Promise<DailyActivity[]>;
}

export interface PlaceRepository {
  searchPlaces(query: string, limit?: number): Promise<PlaceSearchResult[]>;
}

export interface PreviewRepositories {
  earthquakes: EarthquakeRepository;
  revisions: RevisionRepository;
  activity: ActivityRepository;
  places: PlaceRepository;
}

export type PreviewDataLoadState =
  | { status: "loading" }
  | { status: "ready"; session: PreviewDataSession }
  | { status: "error"; error: import("./errors").PreviewDataError };

export interface PreviewDataSession {
  manifest: PreviewManifest;
  repositories: PreviewRepositories;
  close(): Promise<void>;
}
