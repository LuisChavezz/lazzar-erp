import { expect, test } from "@playwright/test";
import nextConfig from "@/next.config";

/**
 * EC-864: toda respuesta lleva `Referrer-Policy: strict-origin`, declarada una
 * sola vez en `headers()` con el source global. Falla si otra entrada de
 * cabeceras (p. ej. las de seguridad pendientes) la quita, la cambia o la
 * duplica.
 */
test("headers() declara Referrer-Policy: strict-origin una sola vez para /:path*", async () => {
  expect(nextConfig.headers).toBeDefined();
  const rules = await nextConfig.headers!();

  const policies = rules.flatMap((rule) =>
    rule.headers
      .filter((header) => header.key.toLowerCase() === "referrer-policy")
      .map((header) => ({ source: rule.source, value: header.value })),
  );

  expect(policies).toEqual([{ source: "/:path*", value: "strict-origin" }]);
});
