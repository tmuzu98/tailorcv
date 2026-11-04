// Global test setup for the web app.
// Adds DOM matchers like toBeInTheDocument() and unmounts components after each test.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
