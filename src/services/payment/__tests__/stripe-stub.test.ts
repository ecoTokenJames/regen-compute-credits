import { describe, it, expect } from "vitest";
import { StripePaymentProvider } from "../stripe-stub.js";

describe("StripePaymentProvider", () => {
  const provider = new StripePaymentProvider();

  it("has name 'stripe'", () => {
    expect(provider.name).toBe("stripe");
  });

  it("authorizePayment returns failed with not-implemented message", async () => {
    const result = await provider.authorizePayment(1000n, "uregen");
    expect(result.status).toBe("failed");
    expect(result.message).toContain("not yet implemented");
    expect(result.id).toBe("stripe-not-implemented");
  });

  it("capturePayment throws not implemented", async () => {
    await expect(provider.capturePayment("test")).rejects.toThrow(
      "not implemented"
    );
  });

  it("refundPayment throws not implemented", async () => {
    await expect(provider.refundPayment("test")).rejects.toThrow(
      "not implemented"
    );
  });
});
