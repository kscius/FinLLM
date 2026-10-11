import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig security defaults", () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it("disables public setup status in production by default", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/finllm";
    process.env.SESSION_SECRET = "x".repeat(32);
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_PUBLIC_SETUP_STATUS;
    delete process.env.INVALIDATE_OTHER_SESSIONS_ON_LOGIN;
    const cfg = loadConfig();
    expect(cfg.ALLOW_PUBLIC_SETUP_STATUS).toBe(false);
    expect(cfg.INVALIDATE_OTHER_SESSIONS_ON_LOGIN).toBe(true);
  });

  it("allows public setup status in development by default", () => {
    process.env.DATABASE_URL = "postgresql://u:p@localhost:5432/finllm";
    process.env.SESSION_SECRET = "x".repeat(32);
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_PUBLIC_SETUP_STATUS;
    const cfg = loadConfig();
    expect(cfg.ALLOW_PUBLIC_SETUP_STATUS).toBe(true);
  });
});
