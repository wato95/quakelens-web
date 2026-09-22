const utcDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});

export function formatUtcDateTime(value: string): string {
  return `${utcDateTimeFormatter.format(new Date(value))} UTC`;
}

export function formatMagnitude(value: number): string {
  return value.toFixed(1);
}

export function formatDepthKm(value: number): string {
  return `${value.toFixed(1)} km`;
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${formatCoordinate(latitude, "N", "S")}, ${formatCoordinate(longitude, "E", "W")}`;
}

export function formatCapturedStates(count: number): string {
  return `${count.toLocaleString("en-GB")} captured ${count === 1 ? "state" : "states"}`;
}

function formatCoordinate(value: number, positive: string, negative: string): string {
  const direction = value < 0 ? negative : positive;
  return `${Math.abs(value).toFixed(4)}° ${direction}`;
}
