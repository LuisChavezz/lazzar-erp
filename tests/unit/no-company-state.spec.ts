import { expect, test } from "@playwright/test";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NoCompanyState, {
  NO_ACTIVE_COMPANY_MESSAGE,
  NO_ACTIVE_COMPANY_TITLE,
  NO_COMPANY_MESSAGE,
  NO_COMPANY_TITLE,
} from "@/src/features/workspace/components/NoCompanyState";
import { toReactElement } from "./support/pwJsx";

/**
 * #506: el aviso de "sin empresa" distingue al superusuario, que puede elegir
 * la empresa activa él mismo (EC-847), del resto, a quien se la asigna un
 * administrador. Corre con `npm run test:unit`.
 */

const sessionFor = (isSuperuser: boolean): Session =>
  ({
    expires: "2099-01-01T00:00:00.000Z",
    user: { id: "1", empresa: null, is_superuser: isSuperuser, is_admin_empresa: false },
  }) as unknown as Session;

const render = (isSuperuser: boolean, props: { compact?: boolean; action?: unknown } = {}) =>
  renderToStaticMarkup(
    createElement(
      SessionProvider,
      { session: sessionFor(isSuperuser) } as Parameters<typeof SessionProvider>[0],
      toReactElement(createElement(NoCompanyState, props as never)),
    ),
  );

test("a regular user keeps the original notice and no action", () => {
  const html = render(false);
  expect(html).toContain(NO_COMPANY_TITLE);
  expect(html).toContain(NO_COMPANY_MESSAGE);
  expect(html).not.toContain("Elegir empresa");
  expect(html).not.toContain('href="/select-branch"');
});

test("a superuser is told to pick an active company and pointed to the selector", () => {
  const html = render(true);
  expect(html).toContain(NO_ACTIVE_COMPANY_TITLE);
  expect(html).toContain(NO_ACTIVE_COMPANY_MESSAGE);
  expect(html).not.toContain(NO_COMPANY_MESSAGE);
  expect(html).toContain('href="/select-branch"');
  expect(html).toContain("Elegir empresa");
});

test("the compact variant shows the superuser text without the link", () => {
  const html = render(true, { compact: true });
  expect(html).toContain(NO_ACTIVE_COMPANY_TITLE);
  expect(html).not.toContain('href="/select-branch"');
});

test("an explicit action replaces the default one", () => {
  const html = render(true, { action: createElement("button", null, "Continuar") });
  expect(html).toContain("Continuar");
  expect(html).not.toContain('href="/select-branch"');
});
