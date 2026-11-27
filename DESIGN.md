# Design System: ERP Lazzar (extraído del código, confirmar antes de publicarlo)

Character: tablero de almacén y contabilidad: folios, SKUs, existencias y saldos que se cuadran; denso, preciso, sin adorno.

Este archivo se extrajo de `src/app/globals.css`, `src/app/layout.tsx` y de los componentes más usados (`DataTable`, `KpiGrid`, `WarehouseFilter`). Lo que ya está en el código es la marca; aquí solo se escribe y se le pone nombre.

## World
Lo que el usuario maneja a diario: folios de pedido, surtido y transferencia, SKUs completos (modelo + color + talla), piezas y costo por almacén. La pantalla tiene que dejar ver **de dónde viene cada pieza y si la cuenta cuadra**.

## Typography
- Cuerpo: **Inter**, cargada con `next/font/google` en `src/app/layout.tsx` (`--font-inter`); fallback `Arial, Helvetica, sans-serif`.
- Títulos (`h1`–`h3`, `.brand-font`): **Poppins**, cargada con `next/font/google` (`--font-poppins`).
- Monoespaciada (`font-mono`, la de Tailwind): solo para lo que se compara carácter por carácter: SKU, folio y código de ubicación. Las cantidades y los importes van en Inter con `tabular-nums`.
- Escala: 10 / 11 / 12 / 14 / 20 / 36 px. Densa a propósito: el cuerpo de las tablas es 14 px, y el contraste vive en **la única cifra clave de cada pantalla** (36 px en escritorio, 30 px en celular: el neto del periodo o el saldo final), no en todos los títulos.
- Pesos: 500 en etiquetas, 600 en datos de una fila, 700 en las cifras.

## Color
Neutros fríos (slate de Tailwind), porque es una herramienta de trabajo de pantalla completa.
- `--background` #ffffff / #0a0a0a (oscuro); texto `--foreground` #171717 / #ededed.
- Texto secundario: slate-500 #64748b en claro (4.76:1 sobre blanco); slate-400 #94a3b8 solo en oscuro (7.72:1 sobre #0a0a0a). slate-400 sobre blanco da 2.56:1: no se usa para texto en claro.
- `--color-accent` #0369a1 (sky-700): firma de la app. Solo para la acción principal y el filtro o la opción seleccionada. Etiqueta blanca sobre él: 5.93:1. El sky-600 #0284c7 anterior daba 4.10:1 con texto blanco y no pasa. Los focos y los enlaces al pasar el mouse siguen en `brand-500` #0ea5e9.
- Danger / error: red-600 #dc2626 (tono ≈ 0°); el acento está en ≈ 200°, a 160° de distancia.
- Éxito: emerald-600 #059669; aviso: amber-600 #d97706; información: blue-600 #2563eb. Son semánticos: entrada = emerald, salida = red, ajuste = amber, transferencia = blue. Nunca decorativos.

## Radii
- 9999px (`rounded-full`): chips de estado y de filtro.
- 12px (`rounded-xl`): campos, botones y selectores.
- 16px (`rounded-2xl`): tarjetas y paneles.
- 8px (`rounded-lg`): botones pequeños dentro de una barra (atajos de fecha).

## Spacing
- Base 4px. Escala usada: 4 / 8 / 12 / 16 / 24 / 32 px.
- Ritmo: apretado dentro de un grupo (4–8 px entre etiqueta y valor, 8 px entre chips) y holgado entre secciones (32 px entre filtros, resumen y tabla).

## Shape and separation
Separación por **bordes de 1px** (slate-200 en claro, white/10 en oscuro). Una sombra solo en menús flotantes. Un plano de color solo para marcar el resultado de una cuenta (saldo final, neto).

## States
- Hover: acento al 90 % (`hover:bg-accent/90`); un campo neutro cambia a fondo blanco y borde `brand-500`.
- Focus: anillo de 2px `ring-brand-500/50`, siempre visible con teclado (`focus-visible`).
- Disabled: 50 % de opacidad y `cursor-not-allowed`.
- Seleccionado: fondo `accent` y texto blanco, con `aria-pressed` / `aria-checked`.

## Status and badges
Texto -700 sobre tinte -50, con borde -200:
- Entrada / éxito: #047857 sobre #ecfdf5, 5.21:1
- Salida / error: #b91c1c sobre #fef2f2, 5.91:1
- Ajuste / aviso: #b45309 sobre #fffbeb, 4.84:1
- Transferencia / información: #1d4ed8 sobre #eff6ff, 6.16:1
- Acento suave: #0369a1 sobre #f0f9ff, 5.57:1

## Voice
Español, en minúsculas como en una oración. Los botones llevan verbo ("Consultar", "Reintentar"). Los vacíos dicen qué falta y qué hacer ("Elige el periodo").
