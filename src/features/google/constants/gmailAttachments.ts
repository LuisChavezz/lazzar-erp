/**
 * Límite de 25 MB por mensaje que impone el backend de Gmail. Se mide sobre el
 * payload base64 realmente transmitido (ver `buildGoogleEmailAttachment`), no
 * sobre el tamaño decodificado del archivo — la codificación base64 infla el
 * tamaño ~33%.
 */
export const MAX_GMAIL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
