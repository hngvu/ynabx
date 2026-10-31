import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiClient, DEFAULT_API_BASE_URL } from "../api/client";
import type { AuthResponse } from "../api/types";

const mockAuthResponse: AuthResponse = {
  access_token: "fresh-jwt-token",
  token_type: "Bearer",
  expires_in: 900,
  user: {
    id: "11111111-1111-1111-1111-111111111111",
    email: "user@example.com",
    display_name: "Test User",
    created_at: "2026-10-28T00:00:00Z",
  },
};

describe("ApiClient Single-Flight Refresh & Session Handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("treats initial 401 on bootstrapSession as unauthenticated without firing onSessionExpired", async () => {
    const onSessionExpired = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
          detail: "No refresh cookie",
        }),
        { status: 401, headers: { "Content-Type": "application/problem+json" } },
      ),
    );

    const client = createApiClient({
      baseUrl: "/api/v1",
      fetchFn: fetchMock,
      onSessionExpired,
    });

    const session = await client.bootstrapSession();
    expect(session).toBeNull();
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/auth/refresh");
  });

  it("deduplicates concurrent bootstrapSession calls (React StrictMode) into a single refresh request", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify(mockAuthResponse), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createApiClient({ baseUrl: "/api/v1", fetchFn: fetchMock });

    const [res1, res2] = await Promise.all([
      client.bootstrapSession(),
      client.bootstrapSession(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res1?.access_token).toBe("fresh-jwt-token");
    expect(res2?.access_token).toBe("fresh-jwt-token");
    expect(client.getAccessToken()).toBe("fresh-jwt-token");
  });

  it("deduplicates concurrent 401 responses into a single /auth/refresh call and retries both requests", async () => {
    let refreshCallCount = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/v1/auth/refresh") {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const authHeader = (init?.headers as Record<string, string> | undefined)?.Authorization;
      if (authHeader !== "Bearer fresh-jwt-token") {
        return new Response(
          JSON.stringify({
            type: "about:blank",
            title: "Unauthorized",
            status: 401,
          }),
          { status: 401, headers: { "Content-Type": "application/problem+json" } },
        );
      }

      return new Response(JSON.stringify([{ id: "plan-1", name: "My Plan" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createApiClient({ baseUrl: "/api/v1", fetchFn: fetchMock });
    client.setAccessToken("expired-token");

    const [plansA, plansB] = await Promise.all([
      client.listPlans(),
      client.listPlans(),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(plansA).toHaveLength(1);
    expect(plansB).toHaveLength(1);
  });

  it("does not re-trigger refresh when /auth/refresh itself returns 401, and calls onSessionExpired once if session was active", async () => {
    const onSessionExpired = vi.fn();
    let refreshCalls = 0;

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/v1/auth/refresh") {
        refreshCalls += 1;
      }
      return new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
        }),
        { status: 401, headers: { "Content-Type": "application/problem+json" } },
      );
    });

    const client = createApiClient({
      baseUrl: "/api/v1",
      fetchFn: fetchMock,
      onSessionExpired,
    });
    client.setAccessToken("previously-active-token");

    await expect(
      Promise.all([client.listPlans(), client.listPlans()]),
    ).rejects.toThrow();

    expect(refreshCalls).toBe(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBeNull();
  });

  it("retries at most once if the retried request still returns 401", async () => {
    let refreshCalls = 0;
    let planCalls = 0;

    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/v1/auth/refresh") {
        refreshCalls += 1;
        return new Response(JSON.stringify(mockAuthResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      planCalls += 1;
      return new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Unauthorized",
          status: 401,
        }),
        { status: 401, headers: { "Content-Type": "application/problem+json" } },
      );
    });

    const client = createApiClient({ baseUrl: "/api/v1", fetchFn: fetchMock });
    client.setAccessToken("expired-token");

    await expect(client.listPlans()).rejects.toThrow();
    expect(refreshCalls).toBe(1);
    expect(planCalls).toBe(2); // Initial attempt + 1 retry
  });
});

describe("ApiClient Environment and Base URL Configuration", () => {
  it("uses custom baseUrl and trims trailing slashes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({
      baseUrl: "https://my-backend.domain.com/api/v1/",
      fetchFn: fetchMock,
    });

    await client.listPlans();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://my-backend.domain.com/api/v1/plans",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("defaults to DEFAULT_API_BASE_URL when baseUrl is omitted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createApiClient({
      fetchFn: fetchMock,
    });

    await client.listPlans();
    const expectedBase = DEFAULT_API_BASE_URL.replace(/\/+$/, "");
    expect(fetchMock).toHaveBeenCalledWith(
      `${expectedBase}/plans`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});
