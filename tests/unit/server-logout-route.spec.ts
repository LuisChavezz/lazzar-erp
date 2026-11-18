import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { GET } from "@/src/app/auth/logout/route";
import {
  isSessionCookieName,
  sessionCookieNamesToExpire,
} from "@/src/features/auth/utils/sessionCookieNames";

/**
 * EC-851: el cierre de sesión del servidor (`/auth/logout`) expira la cookie de
 * sesión de NextAuth en todas sus formas y manda al login.
 */

test.describe("isSessionCookieName", () => {
  test("reconoce la cookie con y sin prefijo y sus trozos", () => {
    for (const name of [
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.session-token.0",
      "__Secure-next-auth.session-token.12",
    ]) {
      expect(isSessionCookieName(name), name).toBe(true);
    }
  });

  test("no confunde otras cookies de next-auth ni de la app", () => {
    for (const name of [
      "next-auth.csrf-token",
      "__Host-next-auth.csrf-token",
      "next-auth.callback-url",
      "erp_workspace_id",
      "next-auth.session-token.x",
      "xnext-auth.session-token",
    ]) {
      expect(isSessionCookieName(name), name).toBe(false);
    }
  });
});

test.describe("sessionCookieNamesToExpire", () => {
  test("siempre incluye las dos formas sin trozos, más los trozos recibidos", () => {
    expect(
      sessionCookieNamesToExpire([
        "next-auth.session-token.0",
        "next-auth.session-token.1",
        "erp_workspace_id",
        "next-auth.session-token",
      ])
    ).toEqual([
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
      "next-auth.session-token.0",
      "next-auth.session-token.1",
    ]);
  });
});

/** Set-Cookie de la respuesta, por nombre, con atributos en minúsculas. */
const parseSetCookies = (response: Response) =>
  new Map(
    response.headers.getSetCookie().map((header) => {
      const [pair, ...attrs] = header.split(";").map((part) => part.trim());
      const name = pair.slice(0, pair.indexOf("="));
      return [name, { header, attrs: attrs.map((attr) => attr.toLowerCase()) }] as const;
    })
  );

test.describe("GET /auth/logout", () => {
  test("expira cada forma de la cookie en path=/ y redirige al login sin caché", () => {
    const request = new NextRequest("https://erp.example.test/auth/logout", {
      headers: {
        cookie:
          "__Secure-next-auth.session-token.0=a; __Secure-next-auth.session-token.1=b; erp_workspace_id=1",
      },
    });
    const response = GET(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://erp.example.test/auth/login");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const cookies = parseSetCookies(response);
    expect([...cookies.keys()].sort()).toEqual(
      [
        "next-auth.session-token",
        "__Secure-next-auth.session-token",
        "__Secure-next-auth.session-token.0",
        "__Secure-next-auth.session-token.1",
      ].sort()
    );
    for (const [name, { attrs }] of cookies) {
      expect(attrs, name).toContain("path=/");
      expect(attrs, name).toContain("max-age=0");
      expect(attrs, name).toContain("httponly");
      expect(attrs, name).toContain("secure");
    }
  });

  test("en http solo marca Secure la forma con prefijo __Secure-", () => {
    const response = GET(new NextRequest("http://localhost:3000/auth/logout"));
    const cookies = parseSetCookies(response);
    expect(cookies.get("next-auth.session-token")?.attrs).not.toContain("secure");
    expect(cookies.get("__Secure-next-auth.session-token")?.attrs).toContain("secure");
  });
});
