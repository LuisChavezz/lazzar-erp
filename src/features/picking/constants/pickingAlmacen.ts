/**
 * Id del almacén "Producto Terminado" — confirmado estable en todos los
 * ambientes (local/staging/producción).
 *
 * Es el almacén ORIGEN de todo picking: no es un campo del formulario, viaja
 * fijo en el `POST` y acota las existencias que pide el Paso 2
 * (`?almacen_origen=`). Vive en `constants/` —y no junto a su único uso en
 * `usePickingStep2Form`— porque el Paso 1 también lo necesita: el backend
 * rechaza un destino igual al origen, así que hay que excluirlo del selector
 * de destino en lugar de ofrecer una opción que garantiza un 400.
 */
export const PRODUCTO_TERMINADO_ALMACEN_ID = 1;
