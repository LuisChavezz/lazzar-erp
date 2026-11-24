import { expect, test } from "@playwright/test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { AxiosError } from "axios";
import { api } from "@/src/api/api";
import { v1_api } from "@/src/api/v1.api";

/**
 * EC-939: la renovación de sesión (`POST /auth/token/refresh/`, cliente `api`)
 * tiene tope. Si el backend la deja sin responder, el refresh rechaza al vencer
 * y el interceptor de 401 de `v1_api` rechaza también a las peticiones que
 * esperaban en su cola, por el mismo camino que un refresh fallido: ninguna
 * queda pendiente para siempre.
 */
test("un refresh que vence su tope rechaza todas las peticiones encoladas", async () => {
  let refreshCalls = 0;
  const server = http.createServer((req, res) => {
    if (req.url === "/auth/token/refresh/") {
      refreshCalls += 1;
      return; // Sin respuesta: el refresh se cuelga.
    }
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ detail: "token expirado" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const baseURL = `http://127.0.0.1:${port}`;

  const previousApi = { baseURL: api.defaults.baseURL, adapter: api.defaults.adapter, timeout: api.defaults.timeout };
  const previousV1 = { baseURL: v1_api.defaults.baseURL, adapter: v1_api.defaults.adapter };
  Object.assign(api.defaults, { baseURL, adapter: "http", timeout: 200 });
  Object.assign(v1_api.defaults, { baseURL, adapter: "http" });

  const started = Date.now();
  try {
    // La primera inicia el refresh; las demás reciben su 401 con el refresh en
    // curso y se encolan.
    const results = await Promise.allSettled([
      v1_api.get("/primera/"),
      v1_api.get("/segunda/"),
      v1_api.get("/tercera/"),
    ]);

    expect(Date.now() - started).toBeLessThan(3_000);
    expect(refreshCalls).toBe(1);
    for (const result of results) {
      expect(result.status).toBe("rejected");
      const reason = (result as PromiseRejectedResult).reason;
      expect(reason).toBeInstanceOf(AxiosError);
      // Cada una rechaza con su propio 401, como tras cualquier refresh fallido.
      expect((reason as AxiosError).response?.status).toBe(401);
    }
  } finally {
    Object.assign(api.defaults, previousApi);
    Object.assign(v1_api.defaults, previousV1);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
