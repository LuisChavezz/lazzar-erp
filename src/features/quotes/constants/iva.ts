/**
 * Tasa de IVA (porcentaje ENTERO) de cotizaciones y pedidos.
 *
 * Es FIJA: el usuario no puede cambiarla en ningún flujo (alta y edición de
 * cotización, edición de pedido por Mesa de Control). Los tres formularios la
 * usan como única fuente para el cálculo de totales y para el campo `iva` del
 * payload, sin importar la tasa con la que se haya guardado el registro: abrir
 * y guardar uno que traía 8 o 0 lo normaliza a 16.
 */
export const IVA_TASA_FIJA = 16;
