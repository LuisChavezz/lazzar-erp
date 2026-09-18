
## ERP NextJS – Instalación y Puesta en Marcha

Este proyecto es un **frontend ERP** construido con **Next.js 16**, pensado para conectarse a una API REST externa (v1) mediante Axios y autenticación con NextAuth.

---

## 1. Requisitos previos

- **Node.js** 24.x (la misma versión mayor que producción en Vercel; otra versión falla al instalar por `engine-strict`).
- **npm** >= 10 (incluido con Node). Es el **único** gestor de paquetes del proyecto: el lockfile versionado es `package-lock.json`. No uses `pnpm`, `yarn` ni `bun`: reinstalan `node_modules` con otra estructura sin respetar el lockfile y dejan el árbol inconsistente.
- Acceso a la **API backend** v1 (URL que se configurará en `NEXT_PUBLIC_API_URL`).

---

## 2. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd <NOMBRE_DEL_REPOSITORIO>
```

---

## 3. Configuración de variables de entorno

El proyecto usa un archivo `.env.local` para variables sensibles. Hay un ejemplo en la raíz:

- [.env.example]

### 3.1 Crear `.env.local`

1. Copia el archivo de ejemplo:

```bash
cp .env.example .env.local
```

> En Windows PowerShell también puedes crear el archivo manualmente y copiar los valores.

2. Edita `.env.local` y asigna valores:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=una-clave-larga-y-segura-para-desarrollo
NEXT_PUBLIC_API_URL=https://TU_API_ERP/api/v1
```

- `NEXTAUTH_URL`: URL donde corre el frontend (en desarrollo, `http://localhost:3000`).
- `NEXTAUTH_SECRET`: cadena aleatoria usada por NextAuth para firmar JWT.
- `NEXT_PUBLIC_API_URL`: URL base de la API v1.  
  - En tu entorno actual se está utilizando algo como:
    - `https://nucleo-erp.vercel.app/api/v1`

Variables adicionales (según las funciones que utilices), incluidas en `.env.example`:

- `FACTURAMA_URL`, `FACTURAMA_USER`, `FACTURAMA_PASSWORD`: credenciales **solo-servidor** para la integración de facturación (Facturama).
- `NEXT_PUBLIC_NGROK_BASE_URL`, `NEXT_PUBLIC_NGROK_API_TOKEN`: endpoint y token del servicio externo de carga de imágenes (galería de bordados en cotizaciones).

> Cualquier cambio en `.env.local` requiere reiniciar el servidor de desarrollo para que tenga efecto.

---

## 4. Instalación de dependencias

Ejecuta en la raíz del proyecto:

```bash
npm ci
```

`npm ci` instala exactamente las versiones de `package-lock.json`. Usa `npm install <paquete>` solo para agregar o actualizar una dependencia (y versiona el `package-lock.json` resultante).

El proyecto declara npm en `packageManager` y `engines` (`package.json`), y `.npmrc` activa `engine-strict`: una versión de Node o npm fuera de rango falla al instalar en lugar de continuar en silencio.

---

## 5. Ejecutar en desarrollo

Una vez instaladas las dependencias y configurado el entorno:

```bash
npm run dev
```

Por defecto, Next.js se levanta en:

- http://localhost:3000

---

## 6. Build para producción

Para generar el build optimizado:

```bash
npm run build
```

Y luego arrancar el servidor en modo producción:

```bash
npm start
```

Por defecto, seguirá utilizando el puerto `3000` (configurable mediante variables de entorno estándar de Next.js).

---

## 7. Linting (Estilos de código)

El proyecto incluye ESLint con configuración para Next.js y TypeScript.

Para ejecutar el linter:

```bash
npm run lint
```

Esto ayuda a mantener un estilo de código consistente y detectar problemas comunes.

El proyecto también incluye verificación de tipos con TypeScript:

```bash
npm run typecheck
```

---

## 8. Documentación adicional

- **Guía de Usuario**: flujo funcional y uso de módulos principales  
  - [GUIA_DE_USUARIO.md]
- **Arquitectura**: stack técnico, organización de carpetas y patrones de diseño  
  - [ARQUITECTURA.md]

Consulta estos documentos para entender mejor cómo usar el ERP y cómo está estructurado internamente.
