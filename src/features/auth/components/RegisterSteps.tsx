import { FieldErrors, UseFormGetValues, UseFormRegister } from "react-hook-form";
import { RegisterSchemaType } from "../schemas/register.schema";
import { FormInput } from "../../../components/FormInput";

interface RegisterStepsProps {
  currentStep: number;
  register: UseFormRegister<RegisterSchemaType>;
  errors: FieldErrors<RegisterSchemaType>;
  getValues: UseFormGetValues<RegisterSchemaType>;
}

export const RegisterSteps = ({ currentStep, register, errors, getValues }: RegisterStepsProps) => {
  switch (currentStep) {
    case 1:
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Nombre"
              placeholder="Juan"
              autoComplete="section-user given-name"
              {...register("usuario_first_name")}
              error={errors.usuario_first_name}
            />
            <FormInput
              label="Apellido"
              placeholder="Pérez"
              autoComplete="section-user family-name"
              {...register("usuario_last_name")}
              error={errors.usuario_last_name}
            />
          </div>
          
          <FormInput
            label="Nombre de usuario"
            placeholder="juanperez"
            autoComplete="section-user username"
            {...register("usuario_username")}
            error={errors.usuario_username}
          />

          <FormInput
            label="Correo electrónico"
            type="email"
            placeholder="juan@ejemplo.com"
            autoComplete="section-user email"
            {...register("usuario_email")}
            error={errors.usuario_email}
          />

          <FormInput
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="section-user new-password"
            {...register("usuario_password")}
            error={errors.usuario_password}
          />

          <FormInput
            label="Confirmar Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="section-user new-password"
            {...register("usuario_password_confirm")}
            error={errors.usuario_password_confirm}
          />
        </div>
      );
    case 2:
      return (
        <div className="space-y-4">
          <FormInput
            label="Razón Social"
            placeholder="Mi Empresa S.A. de C.V."
            autoComplete="section-company organization"
            {...register("empresa_razon_social")}
            error={errors.empresa_razon_social}
          />

          <FormInput
            label="RFC"
            placeholder="XAXX010101000"
            autoComplete="new-password"
            {...register("empresa_rfc")}
            error={errors.empresa_rfc}
          />

          <FormInput
            label="Correo de la empresa"
            type="email"
            placeholder="contacto@miempresa.com"
            autoComplete="section-company work-email"
            {...register("empresa_email")}
            error={errors.empresa_email}
          />

          <FormInput
            label="Código de empresa"
            placeholder="mi-empresa"
            autoComplete="new-password"
            {...register("empresa_codigo")}
            error={errors.empresa_codigo}
          />
        </div>
      );
    case 3:
      return (
        <div className="space-y-4">
          <FormInput
            label="Nombre de sucursal"
            placeholder="Matriz"
            {...register("sucursal_nombre")}
            error={errors.sucursal_nombre}
          />

          <FormInput
            label="Código de sucursal"
            placeholder="SUC-001"
            {...register("sucursal_codigo")}
            error={errors.sucursal_codigo}
          />
        </div>
      );
    case 4:
      const values = getValues();
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Usuario</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-500">Nombre:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.usuario_first_name} {values.usuario_last_name}</span>
              <span className="text-slate-500">Usuario:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.usuario_username}</span>
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.usuario_email}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Empresa</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-500">Razón Social:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.empresa_razon_social}</span>
              <span className="text-slate-500">RFC:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.empresa_rfc}</span>
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.empresa_email}</span>
              <span className="text-slate-500">Código:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.empresa_codigo}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-1">Sucursal</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <span className="text-slate-500">Nombre:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.sucursal_nombre}</span>
              <span className="text-slate-500">Código:</span>
              <span className="text-slate-700 dark:text-slate-200">{values.sucursal_codigo}</span>
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};
