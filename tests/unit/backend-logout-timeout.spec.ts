import { expect, test } from "@playwright/test";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { api } from "@/src/api/api";
import { logout } from "@/src/features/auth/services/actions";
import { BACKEND_LOGOUT_TIMEOUT_MS } from "@/src/features/auth/hooks/useLogout";

/**
 * EC-851: el `POST /auth/logout/` del backend va acotado. Si el backend acepta
 * la conexión y nunca responde, `logout` rechaza a tiempo y `useLogout` sigue
 * al cierre local (`onSettled`) en vez de dejar el botón en `isPending`.
 */

test("el timeout del logout del backend es corto y finito", () => {
  expect(BACKEND_LOGOUT_TIMEOUT_MS).toBeGreaterThan(0);
  expect(BACKEND_LOGOUT_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
});

test("logout rechaza si el backend se cuelga más que el timeout", async () => {
  const pending: http.ServerResponse[] = [];
  const server = http.createServer((_req, res) => void pending.push(res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const previous = { baseURL: api.defaults.baseURL, adapter: api.defaults.adapter };
  api.defaults.baseURL = `http://127.0.0.1:${port}`;
  api.defaults.adapter = "http";
  const started = Date.now();
  try {
    await expect(logout(200)).rejects.toMatchObject({ code: "ECONNABORTED" });
    expect(Date.now() - started).toBeLessThan(2_000);
  } finally {
    Object.assign(api.defaults, previous);
    for (const res of pending) res.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
