import fs from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "@playwright/test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginForm from "@/src/features/auth/components/LoginForm";
import { stripLoginCredentialParams } from "@/src/features/auth/utils/loginUrlCredentials";

/**
 * EC-863: el login nunca debe mandar las credenciales en la URL, ni siquiera si
 * se envía antes de hidratar (envío nativo del `<form>`).
 */

test.describe("LoginForm en el render del servidor", () => {
  // El runner de Playwright reescribe el JSX de los `.tsx` importados, así que
  // no se puede renderizar `LoginForm` con react-dom (ver `money-display`). Se
  // llama como función dentro de un componente que sí renderiza
  // `renderToString` (sus hooks corren con el snapshot de SERVIDOR, el del HTML
  // estático) y se recorre el árbol de elementos que devuelve.
  type ElementNode = { type?: unknown; props?: Record<string, unknown> };

  const findElements = (
    node: unknown,
    match: (element: ElementNode) => boolean,
  ): ElementNode[] => {
    if (Array.isArray(node)) return node.flatMap((child) => findElements(child, match));
    if (!node || typeof node !== "object") return [];
    const element = node as ElementNode;
    const own = match(element) ? [element] : [];
    return [...own, ...findElements(element.props?.children, match)];
  };

  const renderServerTree = (): unknown => {
    let tree: unknown;
    const Probe = ({ onRender }: { onRender: (result: unknown) => void }) => {
      onRender(
        LoginForm({ onShowMfaOptIn: () => {}, onMfaRequired: () => {} }),
      );
      return null;
    };
    renderToString(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(Probe, {
          onRender: (result) => {
            tree = result;
          },
        }),
      ),
    );
    return tree;
  };

  test("el formulario usa method=\"post\": un envío nativo lleva los campos en el body", () => {
    const forms = findElements(renderServerTree(), (element) => element.type === "form");
    expect(forms).toHaveLength(1);
    expect(forms[0].props?.method).toBe("post");
  });

  test("el botón de envío sale deshabilitado del servidor (también bloquea Enter)", () => {
    const submits = findElements(
      renderServerTree(),
      (element) => element.type === "button" && element.props?.type === "submit",
    );
    expect(submits).toHaveLength(1);
    expect(submits[0].props?.disabled).toBe(true);
  });
});

test.describe("callbackUrl explícito en signIn", () => {
  // Sin `callbackUrl`, next-auth usa `window.location.href` y lo guarda en la
  // cookie `next-auth.callback-url`. Se comprueba en el código fuente: probarlo
  // ejecutando `signIn` exigiría simular next-auth, el flujo de login y MFA.
  const FILES = [
    "src/features/auth/components/LoginStepManager.tsx",
    "src/features/auth/components/MfaOtpVerify.tsx",
  ];

  for (const file of FILES) {
    test(`${path.basename(file)} pasa callbackUrl: POST_LOGIN_PATH a cada signIn`, () => {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      const calls = source.match(/signIn\("credentials",\s*\{[^}]*\}/g) ?? [];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call).toMatch(/callbackUrl:\s*POST_LOGIN_PATH\b/);
      }
    });
  }
});

test.describe("stripLoginCredentialParams", () => {
  test("quita email y password y conserva el resto del query y el hash", () => {
    expect(
      stripLoginCredentialParams(
        "http://localhost:3000/auth/login?email=x&callbackUrl=%2Fsales&password=dummy#top",
      ),
    ).toBe("/auth/login?callbackUrl=%2Fsales#top");
  });

  test("sin otros parámetros deja la ruta sin query", () => {
    expect(
      stripLoginCredentialParams("http://localhost:3000/auth/login?email=x&password=dummy"),
    ).toBe("/auth/login");
  });

  test("con solo uno de los dos también limpia", () => {
    expect(stripLoginCredentialParams("http://localhost:3000/auth/login?password=dummy")).toBe(
      "/auth/login",
    );
  });

  test("sin credenciales no hay nada que limpiar", () => {
    expect(stripLoginCredentialParams("http://localhost:3000/auth/login")).toBeNull();
    expect(
      stripLoginCredentialParams("http://localhost:3000/auth/login?callbackUrl=%2F"),
    ).toBeNull();
  });
});
