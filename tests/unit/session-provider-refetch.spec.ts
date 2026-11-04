import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";
import { requestSessionRefetch } from "@/src/features/auth/utils/sessionRecovery";

/**
 * EC-767: `requestSessionRefetch` depende de un mecanismo INTERNO de next-auth
 * 4.24 (el evento `storage` con clave `nextauth.message` que `SessionProvider`
 * escucha para sincronizar pestañas). No hay API pública para releer una sesión
 * que quedó en `null`, así que si una versión de next-auth cambia ese detalle la
 * recuperación de sesión deja de funcionar EN SILENCIO. Este test lo detecta.
 *
 * Monta el `SessionProvider` y `useSession` REALES de `node_modules` en
 * Chromium, sin bundler: un cargador CommonJS mínimo empaqueta `next-auth/react`,
 * `react` y `react-dom/client` tal como están instalados. Solo se simula la red
 * (`/api/auth/session`); el mecanismo bajo prueba no se toca.
 */

const projectRequire = createRequire(path.join(process.cwd(), "package.json"));

interface BundledModule {
  code: string;
  deps: Record<string, string>;
}

/** Empaqueta los módulos CommonJS alcanzables desde `entries` (resueltos como Node). */
const bundleCommonJs = (entries: string[]) => {
  const modules = new Map<string, BundledModule>();
  const queue: string[] = [];
  const resolveFrom = (spec: string, fromDir: string) =>
    projectRequire.resolve(spec, { paths: [fromDir] });
  const enqueue = (file: string) => {
    if (!modules.has(file)) {
      modules.set(file, { code: "", deps: {} });
      queue.push(file);
    }
  };
  const entryIds = entries.map((spec) => {
    const file = resolveFrom(spec, process.cwd());
    enqueue(file);
    return file;
  });
  while (queue.length > 0) {
    const file = queue.shift()!;
    const code = fs.readFileSync(file, "utf8");
    const deps: Record<string, string> = {};
    for (const match of code.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
      const dep = resolveFrom(match[1], path.dirname(file));
      deps[match[1]] = dep;
      enqueue(dep);
    }
    modules.set(file, { code, deps });
  }
  const table = [...modules.entries()]
    .map(
      ([id, mod]) =>
        `${JSON.stringify(id)}: { deps: ${JSON.stringify(mod.deps)}, fn: function (module, exports, require) {\n${mod.code}\n} }`
    )
    .join(",\n");
  return `
    window.process = { env: { NODE_ENV: "production" } };
    (function () {
      var defs = {${table}};
      var cache = {};
      function load(id) {
        if (cache[id]) return cache[id].exports;
        var mod = { exports: {} };
        cache[id] = mod;
        defs[id].fn(mod, mod.exports, function (spec) { return load(defs[id].deps[spec]); });
        return mod.exports;
      }
      window.__modules = ${JSON.stringify(entryIds)}.map(load);
    })();
  `;
};

/** App mínima: un consumidor de `useSession()` dentro del `SessionProvider` real. */
const HARNESS = `
  var React = window.__modules[0];
  var ReactDOMClient = window.__modules[1];
  var NextAuthReact = window.__modules[2];
  function Consumer() {
    var session = NextAuthReact.useSession();
    var email = session.data && session.data.user ? session.data.user.email : "";
    return React.createElement("output", { id: "session" }, session.status + "|" + email);
  }
  ReactDOMClient.createRoot(document.getElementById("root")).render(
    React.createElement(NextAuthReact.SessionProvider, null, React.createElement(Consumer))
  );
`;

const ORIGIN = "http://harness.test";

const mountHarness = async (page: Page, sessionResponses: () => { status: number; body: string }) => {
  const bundle = bundleCommonJs(["react", "react-dom/client", "next-auth/react"]);
  let sessionCalls = 0;
  await page.route(`${ORIGIN}/api/auth/session`, (route) => {
    sessionCalls += 1;
    const { status, body } = sessionResponses();
    return route.fulfill({ status, contentType: "application/json", body });
  });
  // El logger de next-auth reporta errores del cliente a `/_log`.
  await page.route(`${ORIGIN}/api/auth/_log`, (route) => route.fulfill({ status: 200, body: "{}" }));
  await page.route(`${ORIGIN}/`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!doctype html><html><body><div id="root"></div><script>${bundle}</script><script>${HARNESS}</script></body></html>`,
    })
  );
  await page.goto(`${ORIGIN}/`);
  return { sessionCalls: () => sessionCalls };
};

test("una sesión recuperada con requestSessionRefetch llega a los consumidores de useSession()", async ({ page }) => {
  let backendUp = false;
  const harness = await mountHarness(page, () =>
    backendUp
      ? { status: 200, body: JSON.stringify({ user: { email: "admin@lazzar.test" }, expires: "2099-01-01T00:00:00.000Z" }) }
      : { status: 503, body: "Service Unavailable" }
  );
  const output = page.locator("#session");

  // 1. La primera lectura falla: next-auth la toma como "sin sesión".
  await expect(output).toHaveText("unauthenticated|");
  const callsAfterFailure = harness.sessionCalls();

  // 2. Control: con el endpoint ya sano, el refetch de next-auth al volver a la
  //    pestaña NO relee una sesión null. Es la razón de `requestSessionRefetch`.
  backendUp = true;
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await page.waitForTimeout(500);
  await expect(output).toHaveText("unauthenticated|");
  expect(harness.sessionCalls()).toBe(callsAfterFailure);

  // 3. El mecanismo real de la app relee la sesión y la reparte a useSession().
  await page.evaluate(requestSessionRefetch);
  await expect(output).toHaveText("authenticated|admin@lazzar.test");
  expect(harness.sessionCalls()).toBe(callsAfterFailure + 1);
});
