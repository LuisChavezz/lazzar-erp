import { expect, test } from "@playwright/test";
import { ESLint } from "eslint";

/**
 * EC-701: fija que la config de ESLint del repo (alcance + opciones de
 * `@typescript-eslint/no-use-before-define`) sigue marcando la forma de EC-676:
 * un `onSubmit` que lee un primitivo declarado DESPUÉS de `useForm`. El React
 * Compiler memoizaba ese `onSubmit` sin la dependencia y el envío se congelaba.
 */

const RULE = "@typescript-eslint/no-use-before-define";
// Cualquier hook de feature cae en el alcance de la regla (`src/**/hooks/**`).
const HOOK_PATH = "src/features/x/hooks/usePrepararConciliacionForm.ts";

// Forma de `usePrepararConciliacionForm` antes del fix de EC-676 (df3e92de).
const PRE_FIX = `
import { useForm, useStore } from "@tanstack/react-form";

export function usePrepararConciliacionForm({ onPrepared }: { onPrepared: (id: number) => void }) {
  const form = useForm({
    defaultValues: { cuenta_bancaria: 0, fecha_inicio: "" },
    onSubmit: async ({ value }) => {
      if (estadoSolapamiento !== "libre") return;
      onPrepared(value.cuenta_bancaria);
    },
  });

  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const estadoSolapamiento = cuentaBancaria > 0 ? "libre" : "incompleto";

  return { form, estadoSolapamiento };
}
`;

// La misma forma con el fix: el estado viaja como \`onSubmitMeta\`.
const FIXED = `
import { useForm, useStore } from "@tanstack/react-form";

export function usePrepararConciliacionForm({ onPrepared }: { onPrepared: (id: number) => void }) {
  const form = useForm({
    defaultValues: { cuenta_bancaria: 0, fecha_inicio: "" },
    onSubmitMeta: { estadoSolapamiento: "incompleto" },
    onSubmit: async ({ value, meta }) => {
      if (meta.estadoSolapamiento !== "libre") return;
      onPrepared(value.cuenta_bancaria);
    },
  });

  const cuentaBancaria = useStore(form.store, (state) => state.values.cuenta_bancaria);
  const estadoSolapamiento = cuentaBancaria > 0 ? "libre" : "incompleto";
  const submit = () => form.handleSubmit({ estadoSolapamiento });

  return { form, estadoSolapamiento, submit };
}
`;

const ruleMessages = async (code: string) => {
  // Config real del repo (`eslint.config.mjs`, resuelta desde la raíz).
  const [result] = await new ESLint({ cwd: process.cwd() }).lintText(code, { filePath: HOOK_PATH });
  return result.messages.filter((message) => message.ruleId === RULE);
};

test.describe("no-use-before-define (EC-701)", () => {
  test.setTimeout(60_000);

  test("marca la lectura tardía de EC-676 dentro de onSubmit", async () => {
    const messages = await ruleMessages(PRE_FIX);
    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain("estadoSolapamiento");
  });

  test("acepta el fix con onSubmitMeta", async () => {
    expect(await ruleMessages(FIXED)).toEqual([]);
  });
});
