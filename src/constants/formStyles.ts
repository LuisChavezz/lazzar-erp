/**
 * Aspecto de un `FormInput` de solo lectura (`readOnly`, `tabIndex={-1}`, sin
 * `name`): un valor que el usuario ve pero no captura, como el código que
 * genera el backend. Se pasa por `className`; `FormInput` no lo aplica solo.
 */
export const READ_ONLY_INPUT_CLS =
  "cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-slate-400 focus:bg-slate-100 dark:focus:bg-zinc-800 focus:ring-0 focus:border-slate-200 dark:focus:border-zinc-700";
