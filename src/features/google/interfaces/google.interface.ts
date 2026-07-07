
export interface GoogleConnectResponse {
  ok: boolean;
  provider: string;
  auth_url: string;
  redirect_uri: string;
  scope: string;
}

export interface GoogleStatusResponse {
  ok: boolean;
  connected: boolean;
  provider: string;
  account_email?: string;
  token_expires_at?: number;
  has_refresh_token?: boolean;
  scope?: string;
}

export interface GoogleSendEmailResponse {
  ok: boolean;
  message: {
    id: string;
    threadId: string;
  };
}

export interface GoogleEmailAttachment {
  filename: string;
  mimeType: string;
  /**
   * Contenido base64, actualmente enviado CON el prefijo `data:<mime>;base64,`
   * (ver `blobToBase64`). No confirmado contra el backend si acepta el prefijo
   * o requiere base64 puro — pendiente de verificar con el equipo de backend
   * antes de asumir cualquiera de los dos formatos.
   */
  content: string;
}

export interface GoogleEmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: GoogleEmailAttachment[];
}

export interface GoogleEmailMessagesResponse {
  ok: boolean;
  messages: Array<GoogleEmailMessage>;
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GoogleEmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  from_full: string;
  to: string;
  date: string;
}

export interface GoogleEmailMessageDetailResponse {
  ok: boolean;
  email: GoogleEmailMessageDetail;
}

export interface GoogleEmailMessageDetail extends GoogleEmailMessage {
  labelIds: string[];
  body_text: string;
  body_html: string;
}

export interface GoogleEventsResponse {
  ok: boolean;
  events: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description: string;
  htmlLink: string;
  start: string; // ISO string
  status: "confirmed" | "tentative" | "cancelled";
  creator: string;
  end: string;   // ISO string
  updated: string; // ISO string
  location: string;
}

export interface GoogleCalendarEventCreate {
  summary: string;
  start_date: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  end_date?: string;
}