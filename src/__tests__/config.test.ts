import { describe, it, expect, beforeEach, vi } from "vitest";

// Reset the module-level singleton before each test
beforeEach(() => {
  vi.resetModules();
});

describe("loadConfig", () => {
  it("returns defaults when no env vars set", async () => {
    const saved = { ...process.env };
    delete process.env.REGEN_INDEXER_URL;
    delete process.env.REGEN_LCD_URL;
    delete process.env.REGEN_MARKETPLACE_URL;
    delete process.env.REGEN_RPC_URL;
    delete process.env.REGEN_CHAIN_ID;
    delete process.env.REGEN_WALLET_MNEMONIC;
    delete process.env.REGEN_PAYMENT_PROVIDER;
    delete process.env.REGEN_DEFAULT_JURISDICTION;
    delete process.env.ECOBRIDGE_API_URL;
    delete process.env.ECOBRIDGE_ENABLED;
    delete process.env.ECOBRIDGE_CACHE_TTL_MS;

    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    expect(config.indexerUrl).toBe(
      "https://api.regen.network/indexer/v1/graphql"
    );
    expect(config.lcdUrl).toBe("https://lcd-regen.keplr.app");
    expect(config.marketplaceUrl).toBe("https://app.regen.network");
    expect(config.rpcUrl).toBe("http://mainnet.regen.network:26657");
    expect(config.chainId).toBe("regen-1");
    expect(config.walletMnemonic).toBeUndefined();
    expect(config.paymentProvider).toBe("crypto");
    expect(config.defaultJurisdiction).toBe("US");
    expect(config.ecoBridgeApiUrl).toBe("https://api.bridge.eco");
    expect(config.ecoBridgeEnabled).toBe(true);
    expect(config.ecoBridgeCacheTtlMs).toBe(60000);

    process.env = saved;
  });

  it("reads custom env vars", async () => {
    const saved = { ...process.env };
    process.env.REGEN_LCD_URL = "https://custom-lcd.example.com";
    process.env.REGEN_CHAIN_ID = "regen-test-1";
    process.env.REGEN_DEFAULT_JURISDICTION = "DE";
    process.env.ECOBRIDGE_CACHE_TTL_MS = "30000";

    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    expect(config.lcdUrl).toBe("https://custom-lcd.example.com");
    expect(config.chainId).toBe("regen-test-1");
    expect(config.defaultJurisdiction).toBe("DE");
    expect(config.ecoBridgeCacheTtlMs).toBe(30000);

    process.env = saved;
  });

  it("disables ecoBridge when ECOBRIDGE_ENABLED=false", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_ENABLED = "false";

    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    expect(config.ecoBridgeEnabled).toBe(false);

    process.env = saved;
  });

  it("enables ecoBridge for any value other than 'false'", async () => {
    const saved = { ...process.env };
    process.env.ECOBRIDGE_ENABLED = "true";

    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    expect(config.ecoBridgeEnabled).toBe(true);

    process.env = saved;
  });

  it("uses http:// for default RPC URL (Tendermint port 26657)", async () => {
    const saved = { ...process.env };
    delete process.env.REGEN_RPC_URL;

    const { loadConfig } = await import("../config.js");
    const config = loadConfig();

    // Critical fix from fork: port 26657 speaks HTTP, not HTTPS
    expect(config.rpcUrl).toMatch(/^http:\/\//);

    process.env = saved;
  });
});

describe("isWalletConfigured", () => {
  it("returns false when no mnemonic set", async () => {
    const saved = { ...process.env };
    delete process.env.REGEN_WALLET_MNEMONIC;

    const { isWalletConfigured } = await import("../config.js");
    expect(isWalletConfigured()).toBe(false);

    process.env = saved;
  });

  it("returns true when mnemonic is set", async () => {
    const saved = { ...process.env };
    process.env.REGEN_WALLET_MNEMONIC = "test word word word";

    const { isWalletConfigured } = await import("../config.js");
    expect(isWalletConfigured()).toBe(true);

    process.env = saved;
  });

  it("returns false for empty string mnemonic", async () => {
    const saved = { ...process.env };
    process.env.REGEN_WALLET_MNEMONIC = "";

    const { isWalletConfigured } = await import("../config.js");
    expect(isWalletConfigured()).toBe(false);

    process.env = saved;
  });
});
