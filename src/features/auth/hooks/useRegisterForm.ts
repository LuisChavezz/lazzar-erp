import { useState } from "react";
import { UseFormTrigger } from "react-hook-form";
import { useRegister } from "./useRegister";
import { STEPS } from "../constants/register.constants";
import { RegisterSchemaType } from "../schemas/register.schema";

export const useRegisterForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { register: registerUser, isLoading } = useRegister();

  const handleNext = async (trigger: UseFormTrigger<RegisterSchemaType>) => {
    const fieldsToValidate = STEPS[currentStep - 1].fields as (keyof RegisterSchemaType)[];
    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit = (data: RegisterSchemaType) => {
    registerUser(data);
  };

  return {
    currentStep,
    isLoading,
    handleNext,
    handleBack,
    onSubmit,
  };
};
