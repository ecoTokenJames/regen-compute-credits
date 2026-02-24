import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the wallet module to avoid Cosmos SDK dependencies
vi.mock("../../wallet.js", () => ({
  getBalance: vi.fn(),
}));

import { CryptoPaymentProvider } from "../crypto.js";
import { getBalance } from "../../wallet.js";

const mockedGetBalance = vi.mocked(getBalance);

describe("CryptoPaymentProvider", () => {
  let provider: CryptoPaymentProvider;

  beforeEach(() => {
    provider = new CryptoPaymentProvider();
    vi.clearAllMocks();
  });

  it("has name 'crypto'", () => {
    expect(provider.name).toBe("crypto");
  });

  describe("authorizePayment", () => {
    it("returns authorized when balance is sufficient", async () => {
      mockedGetBalance.mockResolvedValue(1000000n);

      const result = await provider.authorizePayment(500000n, "uregen");

      expect(result.status).toBe("authorized");
      expect(result.amountMicro).toBe(500000n);
      expect(result.denom).toBe("uregen");
      expect(result.provider).toBe("crypto");
      expect(result.id).toMatch(/^crypto-\d+$/);
    });

    it("returns authorized when balance equals amount", async () => {
      mockedGetBalance.mockResolvedValue(500000n);

      const result = await provider.authorizePayment(500000n, "uregen");

      expect(result.status).toBe("authorized");
    });

    it("returns failed when balance is insufficient", async () => {
      mockedGetBalance.mockResolvedValue(100n);

      const result = await provider.authorizePayment(500000n, "uregen");

      expect(result.status).toBe("failed");
      expect(result.message).toContain("Insufficient balance");
      expect(result.message).toContain("100");
      expect(result.message).toContain("500000");
    });

    it("handles zero balance", async () => {
      mockedGetBalance.mockResolvedValue(0n);

      const result = await provider.authorizePayment(1n, "uregen");

      expect(result.status).toBe("failed");
    });
  });

  describe("capturePayment", () => {
    it("returns captured receipt (no-op for crypto)", async () => {
      const result = await provider.capturePayment("crypto-123");

      expect(result.status).toBe("captured");
      expect(result.id).toBe("crypto-123");
      expect(result.provider).toBe("crypto");
    });
  });

  describe("refundPayment", () => {
    it("resolves without error (no-op for crypto)", async () => {
      await expect(
        provider.refundPayment("crypto-123")
      ).resolves.toBeUndefined();
    });
  });
});
