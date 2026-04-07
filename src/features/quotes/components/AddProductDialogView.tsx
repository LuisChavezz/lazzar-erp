/**
 * AddProductDialogView.tsx
 * Componente presentacional del diálogo de agregar/editar productos.
 * Recibe toda la API y props desde el hook contenedor `useAddProductDialogState`
 * y renderiza los pasos (selección, bordado, reflejante y tallas).
 */
import type { ComponentProps } from "react";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { STEP_LABELS, type Step } from "../types";
import { StepEmbroidery } from "./StepEmbroidery";
import { StepReflective } from "./StepReflective";
import { StepSelectProduct } from "./StepSelectProduct";
import { StepSizes } from "./StepSizes";

type StepSelectProductProps = ComponentProps<typeof StepSelectProduct>;
type StepEmbroideryProps = ComponentProps<typeof StepEmbroidery>;
type StepReflectiveProps = ComponentProps<typeof StepReflective>;
type StepSizesProps = ComponentProps<typeof StepSizes>;

export interface AddProductDialogViewProps {
  open: boolean;
  title: string;
  isEditing: boolean;
  step: Step;
  orderedSteps: Step[];
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  reflectiveHasBlockingError: boolean;
  onOpenChange: (open: boolean) => void;
  onStepNext: () => void;
  onStepBack: () => void;
  onSaveItem: () => void;
  selectStepProps: StepSelectProductProps;
  embroideryStepProps: StepEmbroideryProps;
  reflectiveStepProps: StepReflectiveProps;
  sizesStepProps: StepSizesProps;
}

/**
 * `AddProductDialogView`
 * Vista sin estado que renderiza la UI del diálogo. Está diseñada para
 * recibir una API completa desde el hook contenedor y mantener la
 * responsabilidad de renderizado separada de la lógica.
 */
export function AddProductDialogView({
  open,
  title,
  isEditing,
  step,
  orderedSteps,
  canProceed,
  isFirstStep,
  isLastStep,
  reflectiveHasBlockingError,
  onOpenChange,
  onStepNext,
  onStepBack,
  onSaveItem,
  selectStepProps,
  embroideryStepProps,
  reflectiveStepProps,
  sizesStepProps,
}: AddProductDialogViewProps) {
  return (
    <MainDialog
      maxWidth="720px"
      title={title}
      description="Selecciona productos, configura servicios adicionales y asigna tallas."
      open={open}
      onOpenChange={onOpenChange}
      actionButtonClose={false}
      actionButton={
        isFirstStep ? (
          <Button variant="primary" onClick={onStepNext} disabled={!canProceed}>
            {orderedSteps.length > 2 ? "Siguiente" : "Continuar"}
          </Button>
        ) : isLastStep ? (
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button variant="secondary" onClick={onStepBack}>
                Regresar
              </Button>
            )}
            <Button variant="primary" onClick={onSaveItem}>
              {isEditing ? "Guardar cambios" : "Agregar"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onStepBack}>
              Regresar
            </Button>
            <Button
              variant="primary"
              onClick={onStepNext}
              disabled={reflectiveHasBlockingError}
            >
              Siguiente
            </Button>
          </div>
        )
      }
    >
      <>
        {!isEditing && (
          <StepProgressBar
            steps={orderedSteps}
            currentStep={step}
            labels={STEP_LABELS}
            ariaLabel="Progreso de configuración del producto"
          />
        )}

        {step === "select" ? (
          <StepSelectProduct {...selectStepProps} />
        ) : step === "embroidery" ? (
          <StepEmbroidery {...embroideryStepProps} />
        ) : step === "reflective" ? (
          <StepReflective {...reflectiveStepProps} />
        ) : (
          <StepSizes {...sizesStepProps} />
        )}
      </>
    </MainDialog>
  );
}
