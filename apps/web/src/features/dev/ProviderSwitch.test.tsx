import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LLM_PROVIDER_HEADER, type HealthResponse } from "@tailorcv/shared";
import { jdFrontendEngineer, sampleResumeSwe } from "@tailorcv/shared/fixtures";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LLM_PROVIDER_STORAGE_KEY } from "../../api/llmProvider";
import { tailorResume } from "../../api/resumes";
import { AppProviders } from "../../app/AppProviders";
import { routes } from "../../app/router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Switch = HealthResponse["llmSwitch"];
function mockApi(llmSwitch: Switch) {
  const calls: { url: string; headers: Headers }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, headers: new Headers(init.headers) });
      if (url.endsWith("/health")) {
        return json({
          status: "ok",
          version: "0.1.0",
          uptimeSec: 1,
          ...(llmSwitch && { llmSwitch }),
        });
      }
      return json({ error: { code: "AI_TIMEOUT", message: "x", requestId: "req_1" } }, 504);
    }),
  );
  return calls;
}

function renderApp() {
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}
const group = () => screen.findByRole("group", { name: /ai model \(development only\)/i });
const sendTailor = () =>
  tailorResume({ resume: sampleResumeSwe, jobDescription: jdFrontendEngineer }).catch(
    () => undefined,
  );
const tailorHeader = (calls: { url: string; headers: Headers }[]) =>
  calls
    .filter((call) => call.url.endsWith("/resumes/tailor"))
    .at(-1)
    ?.headers.get(LLM_PROVIDER_HEADER);

const BOTH: Switch = { default: "ollama", available: ["anthropic", "ollama"] };

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe("ProviderSwitch (development only, D-103)", () => {
  it("is not shown when the API's switch is off (always the case in production)", async () => {
    const calls = mockApi(undefined);
    renderApp();
    expect(await screen.findByText("API: ok (v0.1.0)")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /ai model/i })).not.toBeInTheDocument();
    await sendTailor();
    expect(tailorHeader(calls)).toBeNull();
  });

  it("shows both models, marked dev only, with the server's default selected", async () => {
    mockApi(BOTH);
    renderApp();
    const buttons = within(await group());
    expect(screen.getByText(/dev only/i)).toBeInTheDocument();
    expect(buttons.getByRole("button", { name: "Local model (free)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(buttons.getByRole("button", { name: "Claude (billed)" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("sends no provider header until the tester picks one", async () => {
    const calls = mockApi(BOTH);
    renderApp();
    await group();
    await sendTailor();
    expect(tailorHeader(calls)).toBeNull();
  });

  it("choosing Claude sends X-LLM-Provider: anthropic on the next requests, and back again", async () => {
    const calls = mockApi(BOTH);
    renderApp();
    const buttons = within(await group());
    fireEvent.click(buttons.getByRole("button", { name: "Claude (billed)" }));
    expect(buttons.getByRole("button", { name: "Claude (billed)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await sendTailor();
    expect(tailorHeader(calls)).toBe("anthropic");

    fireEvent.click(buttons.getByRole("button", { name: "Local model (free)" }));
    await sendTailor();
    expect(tailorHeader(calls)).toBe("ollama");
  });

  it("keeps the choice across a reload", async () => {
    window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, "anthropic");
    mockApi(BOTH);
    renderApp();
    const buttons = within(await group());
    expect(buttons.getByRole("button", { name: "Claude (billed)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("Claude cannot be chosen without a key on the server, and a kept choice is dropped", async () => {
    window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, "anthropic");
    const calls = mockApi({ default: "ollama", available: ["ollama"] });
    renderApp();
    const buttons = within(await group());
    expect(buttons.getByRole("button", { name: "Claude (billed)" })).toBeDisabled();
    expect(buttons.getByRole("button", { name: "Local model (free)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => expect(window.localStorage.getItem(LLM_PROVIDER_STORAGE_KEY)).toBeNull());
    await sendTailor();
    expect(tailorHeader(calls)).toBeNull();
  });
});
