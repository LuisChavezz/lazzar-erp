import {
  enrichOrdersWithStatus,
  sharedOrderFilterConfig,
} from '@/src/features/orders/components/SharedOrderColumns';

// El enriquecido de estado y el filtro son los mismos para los tres módulos que
// listan pedidos; viven en `orders/components/SharedOrderColumns.tsx`. Este
// archivo se conserva como punto de entrada de Mesa de Control.
export { enrichOrdersWithStatus };

export const operationsOrderFilterConfig = sharedOrderFilterConfig;
