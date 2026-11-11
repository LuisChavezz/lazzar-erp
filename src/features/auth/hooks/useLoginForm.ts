import { useForm } from "@tanstack/react-form";
import { isAxiosError } from "axios";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
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

const LOGIN_FORM_FIELDS = ["email", "password"] as const satisfies readonly LoginFormField[];

interface LoginFieldValueStore {
	getFieldValue: (field: LoginFormField) => string;
	setFieldValue: (field: LoginFormField, value: string) => void;
}

/**
 * Pasa al estado del formulario lo que muestran los inputs cuando difiere.
 * Lo escrito o autocompletado ANTES de hidratar se queda en el DOM (React no lo
 * sobrescribe al hidratar) pero nunca dispara `onChange`, así que el estado
 * seguiría vacío y se validaría "El correo es obligatorio" con el campo lleno.
 * Se llama al montar y otra vez al enviar: Chrome no expone una contraseña
 * autocompletada a JS hasta que el usuario interactúa, y el envío ya lo es.
 */
const syncFieldsFromDom = (store: LoginFieldValueStore, element: HTMLFormElement) => {
	const data = new FormData(element);
	for (const field of LOGIN_FORM_FIELDS) {
		const domValue = data.get(field);
		if (typeof domValue === "string" && domValue !== store.getFieldValue(field)) {
			store.setFieldValue(field, domValue);
		}
	}
};

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
				/* No se registra el error completo: `error.config.data` incluye el
				 * body de la petición (contraseña en texto plano). Solo se deja
				 * mensaje y status, suficientes para depurar. */
				const status = isAxiosError(error) ? error.response?.status : undefined;
				const message = error instanceof Error ? error.message : String(error);
				console.error("Login error:", { message, status });
				toast.error("Error de conexión");
			}
		},
	});

	/* Ref del `<form>`: al montar (justo después de hidratar) se recoge lo que
	 * el usuario o el navegador escribieron antes. */
	const formRef = useRef<HTMLFormElement>(null);
	useEffect(() => {
		if (formRef.current) syncFieldsFromDom(form, formRef.current);
	}, [form]);

	const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		event.stopPropagation();
		syncFieldsFromDom(form, event.currentTarget);
		void form.handleSubmit();
	};

	const getError = (field: LoginFormField) => {
		const message = clientErrors[field];
		return message ? { message } : undefined;
	};

	return {
		form,
		formRef,
		isPending: loginMutation.isPending,
		clearFieldErrors,
		validateField,
		getError,
		handleFormSubmit,
	};
};
