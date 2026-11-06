import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AppProviders } from "./AppProviders";
import { routes } from "./router";

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

function mockFetchJson(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("App shell", () => {
  it("renders the upload page with the app name", async () => {
    mockFetchJson({ status: "ok", version: "0.1.0", uptimeSec: 1 });
    renderAt("/");

    expect(screen.getByRole("link", { name: "TailorCV" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /upload your resume/i })).toBeInTheDocument();
    expect(await screen.findByText("API: ok (v0.1.0)")).toBeInTheDocument();
  });

  it("calls the health endpoint", async () => {
    const fetchMock = mockFetchJson({ status: "ok", version: "0.1.0", uptimeSec: 1 });
    renderAt("/");

    await screen.findByText(/API: ok/);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/health", expect.anything());
  });

  it("shows 'API: unreachable' when the API is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchJson({ error: "boom" }, 500);
    renderAt("/");

    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });

  it("shows 'API: unreachable' when the response doesn't match the shared schema", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchJson({ status: "weird" });
    renderAt("/");

    expect(await screen.findByText("API: unreachable")).toBeInTheDocument();
  });

  it("renders the 404 page for unknown routes", () => {
    mockFetchJson({ status: "ok", version: "0.1.0", uptimeSec: 1 });
    renderAt("/nope");

    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
  });
});
