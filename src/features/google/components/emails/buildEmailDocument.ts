/**
 * Construye el documento HTML completo que se inyecta en el iframe del correo.
 *
 * Incluye normalización de estilos para correos externos:
 * newsletters, correos de Gmail, Outlook, etc.
 *
 * @param html - Cuerpo HTML del correo, ya decodificado desde base64url.
 */

/**
 * Elimina las referencias a imágenes embebidas con el esquema `cid:` (Content-ID).
 *
 * Los correos multipart incluyen imágenes inline como `<img src="cid:uniqueId">`. El
 * navegador no puede resolver el esquema `cid:` fuera del cliente de correo nativo y
 * genera errores `ERR_UNKNOWN_URL_SCHEME` en consola. Como las imágenes no pueden
 * mostrarse de todas formas, se reemplaza el atributo `src` por un SVG placeholder
 * transparente para evitar el error de red sin romper el layout del correo.
 */
const sanitizeCidImages = (html: string): string =>
  html.replace(
    /(<img\b[^>]*?)\ssrc=["']cid:[^"']*["']([^>]*?>)/gi,
    '$1 src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'/%3E" data-cid-removed="true"$2',
  );

export const buildEmailDocument = (html: string): string => {
  const sanitized = sanitizeCidImages(html);
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        color: #1e293b;
        overflow-x: hidden;
        word-break: break-word;
      }
      img { max-width: 100%; height: auto; display: block; }
      a { color: #0284c7; }
      table { max-width: 100% !important; width: auto; }
    </style>
  </head>
  <body>${sanitized}</body>
</html>`;
};
