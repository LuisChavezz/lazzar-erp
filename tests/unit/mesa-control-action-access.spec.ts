import { expect, test } from "@playwright/test";
import { restoreAuthSecretEnv } from "./support/authSecretEnv";
import { api } from "@/src/api/api";
import { authOptions } from "@/src/lib/auth";
import type { JWT } from "next-auth/jwt";
import type { Session, User } from "next-auth";
import { canActAsMesaControl } from "@/src/utils/permissions";
import {
  MESA_CONTROL_AUTHORIZE_QUOTE_PERMISSION,
  MESA_CONTROL_PEDIDOS_PERMISSION,
} from "@/src/constants/mesaControlActionPermissions";

/**
 * Pruebas unitarias de EC-943: las acciones de Mesa de Control se muestran con
 * `es_mesa_control` de la sesión (la decisión del backend, EC-944). Solo una
 * sesión anterior que no la trae cae al código de permiso del control.
 */

// `authOptions` ya resolvió su secreto al importarse: el worker no se queda con el de prueba.
restoreAuthSecretEnv();

const conCodigo ={ role: "user", permissions: [MESA_CONTROL_PEDIDOS_PERMISSION] };
const sinCodigo = { role: "user", permissions: ["R-MESACONTROL-PEDIDOS"] };

test.describe("canActAsMesaControl", () => {
  test("con la bandera en true se muestra, tenga o no el código", () => {
    expect(canActAsMesaControl({ ...sinCodigo, es_mesa_control: true }, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(true);
    expect(canActAsMesaControl({ ...conCodigo, es_mesa_control: true }, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(true);
  });

  test("con la bandera en false se oculta aunque tenga el código o sea admin", () => {
    // Código concedido sin rol de departamento MESACONTROL: el backend daría 400.
    expect(canActAsMesaControl({ ...conCodigo, es_mesa_control: false }, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(false);
    expect(
      canActAsMesaControl({ role: "admin", permissions: [], es_mesa_control: false }, MESA_CONTROL_PEDIDOS_PERMISSION),
    ).toBe(false);
  });

  test("sin la bandera (sesión anterior) decide el código de respaldo", () => {
    expect(canActAsMesaControl(conCodigo, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(true);
    expect(canActAsMesaControl(sinCodigo, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(false);
    // El respaldo es el código de CADA control, no uno común.
    expect(canActAsMesaControl(conCodigo, MESA_CONTROL_AUTHORIZE_QUOTE_PERMISSION)).toBe(false);
    // Mismo cortocircuito de rol "admin" que `hasPermission`.
    expect(canActAsMesaControl({ role: "admin", permissions: [] }, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(true);
  });

  test("sin sesión se oculta", () => {
    expect(canActAsMesaControl(null, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(false);
    expect(canActAsMesaControl(undefined, MESA_CONTROL_PEDIDOS_PERMISSION)).toBe(false);
  });
});

test.describe("es_mesa_control en el JWT y la sesión de NextAuth", () => {
  const runCallbacks = async (user?: User, token: JWT = {}) => {
    const { callbacks } = authOptions;
    const jwt = await callbacks!.jwt!({ token, user: user as User, account: null } as never);
    const session = await callbacks!.session!({
      session: { user: { id: "", name: null }, expires: "" } as Session,
      token: jwt,
    } as never);
    return { jwt, session: session as Session };
  };

  test("authorize la toma de /auth/user/ solo si es booleana", async () => {
    const { providers } = authOptions;
    const authorize = (providers[0] as unknown as {
      options: { authorize: (c: { accessToken: string }) => Promise<User | null> };
    }).options.authorize;
    const originalGet = api.get;
    const answer = (es_mesa_control: unknown) => {
      api.get = (async () => ({
        data: { id: 7, username: "u", email: "u@x.test", permisos: [], empresa: 1, es_mesa_control },
      })) as unknown as typeof api.get;
    };
    try {
      answer(true);
      expect((await authorize({ accessToken: "t" }))?.es_mesa_control).toBe(true);
      answer(false);
      expect((await authorize({ accessToken: "t" }))?.es_mesa_control).toBe(false);
      // Backend anterior a EC-944 (sin el campo) o un valor de otra forma: "no se sabe".
      answer(undefined);
      expect((await authorize({ accessToken: "t" }))?.es_mesa_control).toBeUndefined();
      answer("true");
      expect((await authorize({ accessToken: "t" }))?.es_mesa_control).toBeUndefined();
    } finally {
      api.get = originalGet;
    }
  });

  test("el inicio de sesión la lleva del usuario al token y a la sesión", async () => {
    for (const flag of [true, false]) {
      const { jwt, session } = await runCallbacks({ id: "7", role: "user", es_mesa_control: flag });
      expect(jwt.es_mesa_control).toBe(flag);
      expect(session.user.es_mesa_control).toBe(flag);
    }
  });

  test("un token anterior que no la trae sigue sin ella (no se vuelve false)", async () => {
    const { session } = await runCallbacks(undefined, { sub: "7", role: "user", permissions: [] });
    expect(session.user.es_mesa_control).toBeUndefined();
  });

  test("update() del cliente no puede escribirla", async () => {
    const { callbacks } = authOptions;
    const token: JWT = { sub: "7", role: "user", es_mesa_control: false, empresa: 1 };
    const jwt = await callbacks!.jwt!({
      token,
      user: undefined as unknown as User,
      account: null,
      trigger: "update",
      session: { es_mesa_control: true, empresa: 1 },
    } as never);
    expect(jwt.es_mesa_control).toBe(false);
  });
});
