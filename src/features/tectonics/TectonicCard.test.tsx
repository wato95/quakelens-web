import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TectonicCard } from "./TectonicCard";
import { EventDetailPanel } from "../../components/layout/EventDetailPanel";
import { makeEvent } from "../../test/eventFixture";
import {
  makeTectonicClassification,
  tectonicManifest,
} from "../../test/tectonicFixture";

const event = makeEvent({ eventRevisionId: "a".repeat(64) });
describe("tectonic setting card", () => {
  it("shows the canonical setting, confidence and reachable compact provenance", async () => {
    const load = vi.fn(async () => makeTectonicClassification());
    render(<TectonicCard event={event} manifest={tectonicManifest} load={load} />);
    expect(screen.getByText("Loading tectonic setting")).toBeInTheDocument();
    expect(await screen.findByText("Active shallow crust")).toBeInTheDocument();
    expect(screen.getByText("High confidence")).toBeInTheDocument();
    expect(load).toHaveBeenCalledExactlyOnceWith("us-test", "a".repeat(64));
    await userEvent.click(screen.getByText("Tectonic provenance"));
    expect(screen.getByText("pf1-tectonic-policy-v1")).toBeVisible();
    expect(screen.getByRole("link", { name: "Validation report" })).toHaveAttribute(
      "href",
      tectonicManifest.tectonics!.validation.url.href,
    );
    expect(
      screen.queryByText(/ProbabilityActive|raw weights|Allen available/i),
    ).not.toBeInTheDocument();
  });
  it("keeps classified results with unknown confidence classified", async () => {
    render(
      <TectonicCard
        event={event}
        manifest={tectonicManifest}
        load={async () =>
          makeTectonicClassification({
            tectonicEnvironment: "SUBDUCTION",
            classificationConfidence: "UNKNOWN",
          })
        }
      />,
    );
    expect(await screen.findByText("Subduction")).toBeInTheDocument();
    expect(screen.getByText("Confidence not established")).toBeInTheDocument();
    expect(
      screen.queryByText("Could not be classified confidently"),
    ).not.toBeInTheDocument();
  });
  it("renders completed unknown neutrally, independently of data errors", async () => {
    render(
      <TectonicCard
        event={event}
        manifest={tectonicManifest}
        load={async () =>
          makeTectonicClassification({
            classificationStatus: "UNKNOWN",
            tectonicEnvironment: "UNKNOWN",
            classificationReasonCode: "TRANSITION",
          })
        }
      />,
    );
    expect(
      await screen.findByText("Could not be classified confidently"),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not use a simplified fallback/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Not available in this preview")).not.toBeInTheDocument();
  });
  it("does not query an unavailable capability", () => {
    const load = vi.fn();
    render(
      <TectonicCard
        event={event}
        manifest={{
          ...tectonicManifest,
          capabilities: {
            ...tectonicManifest.capabilities,
            tectonics: "not_in_preview",
          },
        }}
        load={load}
      />,
    );
    expect(screen.getByText("Not available in this preview")).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it("offers retry for technical errors without exposing internal diagnostics", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error("/private/internal/path"))
      .mockResolvedValue(makeTectonicClassification());
    render(<TectonicCard event={event} manifest={tectonicManifest} load={load} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tectonic data unavailable",
    );
    expect(screen.queryByText(/private\/internal/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Active shallow crust")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
  it("changes exact revision with primary detail and ignores late results", async () => {
    let resolveFirst!: (value: ReturnType<typeof makeTectonicClassification>) => void;
    const load = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(
        makeTectonicClassification({
          eventRevisionId: "b".repeat(64),
          tectonicEnvironment: "SUBDUCTION",
        }),
      );
    const props = {
      open: false,
      onClose: vi.fn(),
      manifest: tectonicManifest,
      loadCapturedHistory: vi.fn(async () => []),
      loadTectonicClassification: load,
    };
    const view = render(<EventDetailPanel {...props} selectedEvent={event} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    view.rerender(
      <EventDetailPanel
        {...props}
        selectedEvent={{ ...event, eventRevisionId: "b".repeat(64) }}
      />,
    );
    expect(await screen.findByText("Subduction")).toBeInTheDocument();
    resolveFirst(makeTectonicClassification());
    await waitFor(() =>
      expect(screen.queryByText("Active shallow crust")).not.toBeInTheDocument(),
    );
    expect(load).toHaveBeenLastCalledWith(event.eventId, "b".repeat(64));
  });
});
