import { LockIcon } from "@/src/components/Icons";
import CompanyCard from "./CompanyCard";

interface LockedCompanyCardProps {
  /** `null` mientras se carga el nombre. */
  name: string | null;
  rfc?: string | null;
}

/**
 * Empresa del workspace, de solo lectura (EC-842). Es la asignada al usuario en
 * el backend. Solo el superusuario puede cambiarla (`cambiar-empresa`): él ve
 * `CompanySwitcherCard` en su lugar (EC-847).
 */
export default function LockedCompanyCard({ name, rfc }: LockedCompanyCardProps) {
  return (
    <CompanyCard
      label="Empresa"
      name={name}
      rfc={rfc}
      disabled
      action={
        <span
          className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
          title="Es la empresa asignada a tu usuario. Por ahora no se puede cambiar."
        >
          <LockIcon className="h-3.5 w-3.5" aria-hidden="true" />
          Asignada a tu usuario
        </span>
      }
    />
  );
}
