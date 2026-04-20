import { useForm } from "@tanstack/react-form";
import type { FormEvent } from "react";
import { useState } from "react";
import toast from "react-hot-toast";
import {
	isLoginErrorResponse,
	isLoginSuccessResponse,
	type LoginSuccessResponse,
} from "../interfaces/auth.interface";
import { useLogin } from "./useLogin";

interface UseLoginFormParams {
	onShowMfaOptIn: (data: LoginSuccessResponse) => void;
	onMfaRequired: (data: LoginSuccessResponse) => void;
}

interface LoginFormValues {
	email: string;
	password: string;
}

type LoginFormField = keyof LoginFormValues;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const useLoginForm = ({ onShowMfaOptIn, onMfaRequired }: UseLoginFormParams) => {
	const loginMutation = useLogin();
	const [clientErrors, setClientErrors] = useState<Partial<Record<LoginFormField, string>>>({});

	const clearFieldErrors = (field: LoginFormField) => {
		setClientErrors((prev) => {
			if (!(field in prev)) {
				return prev;
			}

			const next = { ...prev };
			delete next[field];
			return next;
		});
	};

	const validateField = (field: LoginFormField, value: string) => {
		let message: string | undefined;

		if (field === "email") {
			if (!value.trim()) {
				message = "El correo es obligatorio";
			} else if (!EMAIL_REGEX.test(value.trim())) {
				message = "Ingresa un correo válido";
			}
		}

		if (field === "password" && !value.trim()) {
			message = "La contraseña es obligatoria";
		}

		if (!message) {
			setClientErrors((prev) => {
				if (!(field in prev)) {
					return prev;
				}

				const next = { ...prev };
				delete next[field];
				return next;
			});
			return true;
		}

		setClientErrors((prev) => ({ ...prev, [field]: message }));
		return false;
	};

	const validateForm = (values: LoginFormValues) => {
		const isEmailValid = validateField("email", values.email);
		const isPasswordValid = validateField("password", values.password);
		return isEmailValid && isPasswordValid;
	};

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		} as LoginFormValues,
		onSubmit: async ({ value }) => {
			if (!validateForm(value)) {
				return;
			}

			try {
				const result = await loginMutation.mutateAsync({
					email: value.email,
					password: value.password,
				});

				if (isLoginErrorResponse(result)) {
					toast.error(result.non_field_errors[0] ?? "Usuario o contraseña incorrectos");
					return;
				}

				if (!isLoginSuccessResponse(result)) {
					toast.error("La respuesta de autenticación no es válida");
					return;
				}

				if (!result.mfa_enabled) {
					onShowMfaOptIn(result);
					return;
				}

				/* MFA ya activo: dirigir al paso de verificación OTP */
				onMfaRequired(result);
			} catch (error) {
				console.error("Login error:", error);
				toast.error("Error de conexión");
			}
		},
	});

	const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		void form.handleSubmit();
	};

	const getError = (field: LoginFormField) => {
		const message = clientErrors[field];
		return message ? { message } : undefined;
	};

	return {
		form,
		isPending: loginMutation.isPending,
		clearFieldErrors,
		validateField,
		getError,
		handleFormSubmit,
	};
};
