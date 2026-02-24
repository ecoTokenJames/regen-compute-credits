import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock global fetch to avoid real network calls
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getRetirementById", () => {
  it("uses direct nodeId query for base64 IDs starting with 'Wy'", async () => {
    const mockRetirement = {
      nodeId: "WyJyZXRpcmVtZW50IiwxXQ==",
      type: "retirement",
      amount: "1.5",
      batchDenom: "C01-001-20210101-20211231-001",
      jurisdiction: "US",
      owner: "regen1abc",
      reason: "AI compute offset",
      timestamp: "2024-01-01T00:00:00Z",
      txHash: "abc123",
      blockHeight: "12345",
      chainNum: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { retirement: mockRetirement },
      }),
    });

    const { getRetirementById } = await import("../indexer.js");
    const result = await getRetirementById("WyJyZXRpcmVtZW50IiwxXQ==");

    expect(result).toEqual(mockRetirement);
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.query).toContain("retirement(nodeId:");
  });

  it("lowercases tx hash for indexer query (fork fix)", async () => {
    const mockRetirement = {
      nodeId: "WyJyZXRpcmVtZW50IiwyXQ==",
      type: "retirement",
      amount: "2.0",
      batchDenom: "C01-001-20210101-20211231-002",
      jurisdiction: "DE",
      owner: "regen1xyz",
      reason: "Test",
      timestamp: "2024-06-01T00:00:00Z",
      txHash: "abcdef1234567890",
      blockHeight: "99999",
      chainNum: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { allRetirements: { nodes: [mockRetirement] } },
      }),
    });

    const { getRetirementById } = await import("../indexer.js");
    // Pass uppercase hash — should be lowercased before querying
    await getRetirementById("ABCDEF1234567890");

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // The variable should be lowercased (fork fix: indexer stores lowercase)
    expect(callBody.variables.hash).toBe("abcdef1234567890");
  });

  it("returns null when retirement not found via tx hash", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { allRetirements: { nodes: [] } },
      }),
    });

    const { getRetirementById } = await import("../indexer.js");
    const result = await getRetirementById("nonexistenthash");

    expect(result).toBeNull();
  });

  it("returns null on fetch error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { getRetirementById } = await import("../indexer.js");
    const result = await getRetirementById("somehash");

    expect(result).toBeNull();
  });
});

describe("waitForRetirement", () => {
  it("returns retirement when found on first poll", async () => {
    const mockRetirement = {
      nodeId: "WyJyZXRpcmVtZW50IiwzXQ==",
      type: "retirement",
      amount: "1.0",
      batchDenom: "C01-001-20210101-20211231-003",
      jurisdiction: "US",
      owner: "regen1poll",
      reason: "Polling test",
      timestamp: "2024-01-15T00:00:00Z",
      txHash: "pollhash123",
      blockHeight: "55555",
      chainNum: 1,
    };

    // First call: tx hash lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { allRetirements: { nodes: [mockRetirement] } },
      }),
    });

    const { waitForRetirement } = await import("../indexer.js");
    const result = await waitForRetirement("pollhash123", 3, 10);

    expect(result).toEqual(mockRetirement);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("returns null after max attempts", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { allRetirements: { nodes: [] } },
      }),
    });

    const { waitForRetirement } = await import("../indexer.js");
    const result = await waitForRetirement("neverFound", 2, 10);

    expect(result).toBeNull();
    // 2 attempts
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
