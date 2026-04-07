/**
 * Infraestructura SMTP compartida para el flujo de envio.
 * Este modulo centraliza configuracion, remitente por defecto y cache del transporter.
 */
import nodemailer from "nodemailer";

const DEFAULT_SMTP_HOST = "smtp.gmail.com";
const DEFAULT_SMTP_PORT = 587;

// Reutilizamos el transporter a nivel de modulo para evitar recrearlo en cada solicitud.
let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Valida que una variable requerida para SMTP exista antes de intentar enviar.
 */
const getRequiredEmailEnv = (value: string | undefined, envName: string) => {
  if (!value) {
    throw new Error(`Falta configurar la variable de entorno ${envName}.`);
  }

  return value;
};

/**
 * Resuelve la configuracion SMTP efectiva mezclando defaults y variables de entorno.
 */
export const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || DEFAULT_SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
  const user = process.env.SMTP_USER || process.env.EMAIL_HOST_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_HOST_PASSWORD;

  return {
    host,
    port,
    secure,
    user: getRequiredEmailEnv(user, "SMTP_USER o EMAIL_HOST_USER"),
    pass: getRequiredEmailEnv(pass, "SMTP_PASS o EMAIL_HOST_PASSWORD"),
  };
};

/** Remitente por defecto para el correo saliente. */
export const getEmailFrom = () => process.env.EMAIL_FROM || getSmtpConfig().user;

/**
 * Crea o reutiliza el transporter Nodemailer ya configurado.
 * El cache reduce costo de inicializacion en multiples solicitudes.
 */
export const getMailTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const smtpConfig = getSmtpConfig();

  cachedTransporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  return cachedTransporter;
};