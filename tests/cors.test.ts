import { describe, expect, it } from "vitest";

import { buildServer } from "../src/server.js";

describe("CORS multi-origin support (#590)", () => {
  it("reflects allowed origins when corsOrigins contains multiple origins", async () => {
    const app = await buildServer({
      corsOrigins: [
        "https://app.tricklepay.org",
        "https://staging.tricklepay.org",
      ],
    });
    app.get("/test-cors", async () => ({ status: "ok" }));

    try {
      // 1. First allowed origin
      const res1 = await app.inject({
        method: "GET",
        url: "/test-cors",
        headers: { origin: "https://app.tricklepay.org" },
      });
      expect(res1.statusCode).toBe(200);
      expect(res1.headers["access-control-allow-origin"]).toBe(
        "https://app.tricklepay.org",
      );

      // 2. Second allowed origin
      const res2 = await app.inject({
        method: "GET",
        url: "/test-cors",
        headers: { origin: "https://staging.tricklepay.org" },
      });
      expect(res2.statusCode).toBe(200);
      expect(res2.headers["access-control-allow-origin"]).toBe(
        "https://staging.tricklepay.org",
      );

      // 3. Unlisted origin receives NO CORS headers
      const resEvil = await app.inject({
        method: "GET",
        url: "/test-cors",
        headers: { origin: "https://unauthorized-origin.com" },
      });
      expect(resEvil.statusCode).toBe(200);
      expect(resEvil.headers["access-control-allow-origin"]).toBeUndefined();

      // 4. Preflight OPTIONS request from an unlisted origin receives NO CORS headers
      const preflightEvil = await app.inject({
        method: "OPTIONS",
        url: "/test-cors",
        headers: {
          origin: "https://unauthorized-origin.com",
          "access-control-request-method": "GET",
        },
      });
      expect(
        preflightEvil.headers["access-control-allow-origin"],
      ).toBeUndefined();
    } finally {
      await app.close();
    }
  });

  it("reflects any origin when CORS_ORIGIN is unset (default)", async () => {
    const app = await buildServer();
    app.get("/test-cors-default", async () => ({ status: "ok" }));

    try {
      const res = await app.inject({
        method: "GET",
        url: "/test-cors-default",
        headers: { origin: "https://random-frontend.com" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBe(
        "https://random-frontend.com",
      );
    } finally {
      await app.close();
    }
  });
});
