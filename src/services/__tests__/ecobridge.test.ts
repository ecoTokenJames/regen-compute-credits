import { describe, it, expect, vi, beforeEach } from "vitest";

// Reset module-level singletons before each test
beforeEach(() => {
  vi.resetModules();
});

describe("buildRetirementUrl", () => {
  it("derives app URL from api URL", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_API_URL = "https://api.bridge.eco";
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { buildRetirementUrl } = await import("../ecobridge.js");
    const url = buildRetirementUrl({ chain: "ethereum" });

    expect(url).toContain("app.bridge.eco");
    expect(url).toContain("chain=ethereum");

    process.env = saved;
  });

  it("includes all query params when provided", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_API_URL = "https://api.bridge.eco";
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { buildRetirementUrl } = await import("../ecobridge.js");
    const url = buildRetirementUrl({
      chain: "polygon",
      token: "USDC",
      projectId: "C01-001",
      amount: 5.5,
      beneficiaryName: "Alice",
      retirementReason: "AI compute offset",
      jurisdiction: "US",
    });

    const parsed = new URL(url);
    expect(parsed.searchParams.get("chain")).toBe("polygon");
    expect(parsed.searchParams.get("token")).toBe("USDC");
    expect(parsed.searchParams.get("project")).toBe("C01-001");
    expect(parsed.searchParams.get("amount")).toBe("5.5");
    expect(parsed.searchParams.get("beneficiary")).toBe("Alice");
    expect(parsed.searchParams.get("reason")).toBe("AI compute offset");
    expect(parsed.searchParams.get("jurisdiction")).toBe("US");

    process.env = saved;
  });

  it("omits undefined params", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_API_URL = "https://api.bridge.eco";
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { buildRetirementUrl } = await import("../ecobridge.js");
    const url = buildRetirementUrl({ chain: "ethereum" });

    const parsed = new URL(url);
    expect(parsed.searchParams.has("chain")).toBe(true);
    expect(parsed.searchParams.has("token")).toBe(false);
    expect(parsed.searchParams.has("amount")).toBe(false);

    process.env = saved;
  });

  it("handles custom API URLs", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_API_URL = "https://api.custom-bridge.example.com";
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { buildRetirementUrl } = await import("../ecobridge.js");
    const url = buildRetirementUrl({});

    expect(url).toContain("app.custom-bridge.example.com");

    process.env = saved;
  });

  it("falls back to original URL if hostname does not start with api.", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_API_URL = "https://bridge.eco";
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { buildRetirementUrl } = await import("../ecobridge.js");
    const url = buildRetirementUrl({});

    // Should NOT prepend app. because hostname doesn't start with api.
    expect(url).toContain("bridge.eco");

    process.env = saved;
  });
});
