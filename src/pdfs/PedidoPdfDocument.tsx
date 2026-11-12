/**
 * Documento PDF de un pedido, sobre la plantilla base `DocumentPdfLayout`
 * (EC-855/EC-856): el marco (empresa activa, folio, fecha, marca de cancelado,
 * pie paginado) es el de todos los documentos; aquí solo va el cuerpo.
 *
 * ─── CONTENIDO ───────────────────────────────────────────────────────────────
 * Lo mismo que la hoja "Pedido" del detalle 360° (`OrderMainSheet`), con sus
 * mismas reglas y los mismos helpers: datos del pedido, foto fiscal del
 * cliente, envío, pago y contacto, partidas producto+color con sus tallas
 * ("CH (5), M (3)"), servicios por talla, servicios extra, cargos y totales.
 * Nada de surtido ni de SKU de muestra por talla: eso es seguimiento interno
 * (hoja de Avances y diálogo de vinculación), no parte del documento.
 *
 * - Línea de MUESTRA (`isSampleLine`): la columna SKU dice "Muestra" y la
 *   descripción es su `producto_nombre_externo` (`lineProductName`).
 * - El régimen fiscal del cliente NO va: llega como id y resolverlo exige el
 *   catálogo SAT, y el PDF se arma solo con lo que el pedido trae.
 * - Sin servicios extra o sin cargos mayores a cero, su bloque se omite.
 *
 * ─── IMPORTES OCULTOS ────────────────────────────────────────────────────────
 * El backend ELIMINA los campos contables según el rol
 * (`filtrar_campos_contabilidad_pedido`) y este documento se genera con esa
 * respuesta. Lo que no viene no se pinta: la columna Precio (y la de Monto de
 * los servicios) se omite si ningún renglón trae la clave, cada renglón de
 * totales sin su clave desaparece, y los bloques de forma de pago, condiciones
 * y cargos solo existen con datos contables.
 *
 * La columna Importe es la de la pantalla: el backend no da el importe por
 * línea (llega en cero), así que se publica el de `reconciledLineAmounts`
 * —cantidad × precio de cada talla— SOLO cuando la suma concilia con el
 * `subtotal` del backend; si no, la columna no existe. Los totales son los del
 * backend tal cual.
 */
import { View } from "@react-pdf/renderer";
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusConfig,
  getTipoPedidoConfig,
} from "@/src/features/orders/constants/pedidoStatus";
import { getFormaPagoLabel, getMetodoPagoLabel, getUsoCfdiLabel } from "@/src/features/orders/constants/satCatalogs";
import type {
  Order,
  PedidoDetail,
  PedidoDetalleLinea,
  PedidoServicioExtra,
} from "@/src/features/orders/interfaces/order.interface";
import {
  canSeeAccounting,
  centsToDecimalString,
  reconciledLineAmounts,
  summarizeLinePrice,
} from "@/src/features/orders/utils/orderAccounting";
import {
  isSampleLine,
  lineProductName,
  lineSizesSummary,
  summarizeLineService,
  type LineServiceFlag,
} from "@/src/features/orders/utils/orderLines";
import { formatEntregaEstimada, formatFechaCalendario } from "@/src/features/orders/utils/pedidoFormat";
import { pedidoPdfDescriptor } from "@/src/features/orders/utils/pedidoPdfDescriptor";
import type { PedidoPdfCurrency } from "@/src/features/orders/utils/loadPedidoForPdf";
import { formatMoneyValue, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import {
  DocumentPdfLayout,
  PdfCardRow,
  PdfCellCaption,
  PdfCellText,
  PdfInfoCard,
  PdfLineItemsTable,
  PdfNotes,
  PdfTotals,
  type PdfColumn,
  type PdfInfoItem,
} from "./shared/DocumentPdfLayout";
import type { PdfCompany } from "./shared/documentPdfModel";

type PedidoPdfDocumentProps = {
  pedido: PedidoDetail;
  company: PdfCompany | null;
  /** `null` cuando el usuario no ve importes. */
  currency: PedidoPdfCurrency | null;
};

/** Servicios por talla, con el nombre de la columna de la pantalla. */
const LINE_SERVICES: { flag: LineServiceFlag; label: string }[] = [
  { flag: "lleva_bordado", label: "Bordado" },
  { flag: "lleva_reflejante", label: "Reflejante" },
  { flag: "lleva_corte_manga", label: "Corte manga" },
  { flag: "lleva_cambio_talla", label: "Cambio talla" },
];

/** Cargos de cabecera, en el orden de "Cargos Adicionales" (`OrderChargesSection`). */
const CHARGES: { key: keyof Order; label: string }[] = [
  { key: "flete", label: "Flete" },
  { key: "seguros", label: "Seguros" },
  { key: "anticipo", label: "A cuenta (Anticipo)" },
  { key: "envio", label: "Envío" },
  { key: "programa_bordados", label: "Programa bordados" },
  { key: "serigrafia", label: "Serigrafía" },
  { key: "reflejante", label: "Reflejante" },
  { key: "bordado_pantalones_extras", label: "Bordado pantalones (extras)" },
];

/** Condiciones de pago, como el panel "Condiciones de pago" de la pantalla. */
const PAYMENT_CONDITIONS: { key: keyof Order; label: string }[] = [
  { key: "anticipo_total", label: "Anticipo total" },
  { key: "anticipo_parcial", label: "Anticipo parcial" },
  { key: "vendedor_autoriza", label: "Vendedor autoriza" },
  { key: "pago_antes_embarque", label: "Pago antes de embarque" },
  { key: "por_confirmar", label: "Por confirmar" },
  { key: "otra_cantidad", label: "Otra cantidad" },
];

const textOrDash = (value: string | null | undefined): string => value?.trim() || "-";

/** Domicilio en una línea con las partes que vengan: "Calle 1, Centro, C.P. 44100, …". */
const joinAddress = (parts: {
  direccion: string | null;
  colonia: string | null;
  codigoPostal: string | null;
  ciudad: string | null;
  estado: string | null;
}): string =>
  [
    parts.direccion,
    parts.colonia,
    parts.codigoPostal?.trim() ? `C.P. ${parts.codigoPostal.trim()}` : null,
    parts.ciudad,
    parts.estado,
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ") || "-";

/** "Bordado · Reflejante (CH, M)": los servicios de la línea; "Parcial" con sus tallas. */
const lineServicesCaption = (linea: PedidoDetalleLinea): string | null => {
  const services = LINE_SERVICES.flatMap(({ flag, label }) => {
    const summary = summarizeLineService(linea, flag);
    if (summary.kind === "none") return [];
    return [summary.kind === "partial" ? `${label} (${summary.sizes.join(", ")})` : label];
  });
  return services.length > 0 ? services.join(" · ") : null;
};

export const PedidoPdfDocument = ({ pedido, company, currency }: PedidoPdfDocumentProps) => {
  const detalles = pedido.detalles ?? [];
  const servicios = pedido.servicios_extras ?? [];
  const showAccounting = canSeeAccounting(pedido);
  const monedaCodigo = currency?.codigo ?? null;

  // Importes en la MONEDA DEL PEDIDO; solo se llama con un valor presente.
  const money = (value: string) => formatMoneyValue(value, monedaCodigo);
  // `undefined`/`null` = la clave no vino (rol sin importes) o vino vacía.
  const moneyIfPresent = (value: string | null | undefined) =>
    value == null ? undefined : money(value);
  // Descuento e IEPS solo aparecen cuando son mayores a cero (como en pantalla).
  const moneyIfPositive = (value: string | null | undefined) =>
    value != null && safeParseAmount(value) > 0 ? money(value) : undefined;

  const lineAmounts = showAccounting ? reconciledLineAmounts(pedido) : null;
  const totalPiezas = detalles.reduce((sum, linea) => sum + (linea.cantidad_total ?? 0), 0);
  const cliente = pedido.cliente_razon_social || pedido.cliente_nombre || "-";

  const lineColumns: PdfColumn<PedidoDetalleLinea>[] = [
    {
      id: "partida",
      header: "#",
      flex: 0.5,
      cell: (_linea, index) => String(index + 1),
    },
    {
      id: "sku",
      header: "SKU",
      flex: 1.4,
      cell: (linea) => (isSampleLine(linea) ? "Muestra" : linea.sku_base || "-"),
    },
    {
      id: "descripcion",
      header: "Descripción",
      flex: 3.6,
      cell: (linea) => {
        const servicesCaption = lineServicesCaption(linea);
        return (
          <View>
            <PdfCellText bold>{lineProductName(linea)}</PdfCellText>
            {linea.color_nombre ? <PdfCellCaption>{`Color: ${linea.color_nombre}`}</PdfCellCaption> : null}
            {servicesCaption ? <PdfCellCaption>{servicesCaption}</PdfCellCaption> : null}
          </View>
        );
      },
    },
    {
      id: "tallas",
      header: "Tallas",
      flex: 2.6,
      cell: (linea) => lineSizesSummary(linea),
    },
    {
      id: "cantidad",
      header: "Cantidad",
      flex: 1,
      align: "right",
      cell: (linea) => (linea.cantidad_total ?? 0).toLocaleString("es-MX"),
    },
    {
      id: "precio",
      header: "Precio u.",
      flex: 1.4,
      align: "right",
      field: "precio_unitario",
      cell: (linea) => {
        const price = summarizeLinePrice(linea);
        if (price.kind === "uniform") return moneyIfPresent(price.value) ?? "";
        // Tallas con precios distintos: "Varía" y el precio de cada una debajo
        // (en pantalla va en el tooltip).
        return (
          <View>
            <PdfCellText>Varía</PdfCellText>
            {price.bySize.map((size) => (
              <PdfCellCaption key={size.talla}>
                {`${size.talla}: ${moneyIfPresent(size.precio) ?? "-"}`}
              </PdfCellCaption>
            ))}
          </View>
        );
      },
    },
    // Importe solo cuando concilia con el subtotal (ver arriba).
    ...(lineAmounts
      ? [
          {
            id: "importe",
            header: "Importe",
            flex: 1.5,
            align: "right" as const,
            bold: true,
            cell: (linea: PedidoDetalleLinea) =>
              money(centsToDecimalString(lineAmounts[linea.id] ?? 0)),
          },
        ]
      : []),
  ];

  const serviceColumns: PdfColumn<PedidoServicioExtra>[] = [
    {
      id: "servicio",
      header: "Servicio",
      flex: 5,
      cell: (servicio) => (
        <View>
          <PdfCellText bold>{servicio.nombre}</PdfCellText>
          {servicio.visible_en_factura ? null : <PdfCellCaption>No visible en factura</PdfCellCaption>}
        </View>
      ),
    },
    {
      id: "cantidad",
      header: "Cantidad",
      flex: 1,
      align: "right",
      cell: (servicio) => servicio.cantidad.toLocaleString("es-MX"),
    },
    {
      id: "monto",
      header: "Monto",
      flex: 1.5,
      align: "right",
      bold: true,
      field: "monto",
      cell: (servicio) => moneyIfPresent(servicio.monto) ?? "",
    },
  ];

  const pedidoItems: PdfInfoItem[] = [
    { label: "Estatus", value: getPedidoEstatusConfig(pedido.estatus).label },
    { label: "Tipo de pedido", value: getTipoPedidoConfig(pedido.tipo_pedido).label },
    { label: "Clasificación", value: getPedidoClasificacionLabel(pedido.clasificacion) },
    { label: "Fecha confirmada", value: formatFechaCalendario(pedido.fecha_confirmacion) },
    {
      label: "Entrega estimada",
      value: formatEntregaEstimada(pedido.fecha_entrega_min, pedido.fecha_entrega_max),
    },
    { label: "O.C. del cliente", value: textOrDash(pedido.oc) },
  ];

  const clienteItems: PdfInfoItem[] = [
    { label: "Cliente", value: textOrDash(pedido.cliente_nombre) },
    { label: "Razón social", value: textOrDash(pedido.cliente_razon_social) },
    { label: "RFC", value: textOrDash(pedido.cliente_rfc) },
    { label: "Giro empresarial", value: textOrDash(pedido.cliente_giro_empresarial) },
    {
      label: "Dirección fiscal",
      value: joinAddress({
        direccion: pedido.cliente_direccion_fiscal,
        colonia: pedido.cliente_colonia,
        codigoPostal: pedido.cliente_codigo_postal,
        ciudad: pedido.cliente_ciudad,
        estado: pedido.cliente_estado,
      }),
    },
  ];

  const envioItems: PdfInfoItem[] = [
    { label: "Destinatario", value: textOrDash(pedido.destinatario) },
    { label: "Empresa", value: textOrDash(pedido.empresa_envio) },
    { label: "Teléfono", value: textOrDash(pedido.telefono_envio) },
    { label: "Celular", value: textOrDash(pedido.celular_envio) },
    {
      label: "Dirección",
      value: joinAddress({
        direccion: pedido.direccion_envio,
        colonia: pedido.colonia_envio,
        codigoPostal: pedido.codigo_postal,
        ciudad: pedido.ciudad_envio,
        estado: pedido.estado_envio,
      }),
    },
    { label: "Referencias", value: textOrDash(pedido.referencias) },
    { label: "Empaque ecológico", value: pedido.empaque_ecologico ? "Sí" : "No" },
    { label: "Embarque parcial", value: pedido.embarque_parcial ? "Sí" : "No" },
  ];

  // Forma de pago, método y uso de CFDI son contables: sin la clave, su renglón
  // no existe (no "—", que diría "sin capturar").
  const activeConditions = PAYMENT_CONDITIONS.filter((condition) => pedido[condition.key] === true);
  const pagoItems: PdfInfoItem[] = [
    { label: "Persona pagos", value: textOrDash(pedido.persona_pagos) },
    { label: "Correo facturas", value: textOrDash(pedido.correo_facturas) },
    { label: "Teléfono pagos", value: textOrDash(pedido.telefono_pagos) },
    ...(pedido.forma_pago !== undefined
      ? [{ label: "Forma de pago", value: getFormaPagoLabel(pedido.forma_pago) }]
      : []),
    ...(pedido.metodo_pago !== undefined
      ? [{ label: "Método de pago", value: getMetodoPagoLabel(pedido.metodo_pago) }]
      : []),
    ...(pedido.uso_cfdi !== undefined
      ? [{ label: "Uso de CFDI", value: getUsoCfdiLabel(pedido.uso_cfdi) }]
      : []),
    // Panel entero solo con datos contables: con una sola bandera
    // sobreviviente las demás se leerían como "no aplica" (ver la pantalla).
    ...(showAccounting
      ? [
          {
            label: "Condiciones",
            value:
              activeConditions.length > 0
                ? activeConditions.map((condition) => condition.label).join(", ")
                : "Sin condición registrada",
          },
        ]
      : []),
    ...(moneyIfPositive(pedido.monto) !== undefined
      ? [{ label: "Monto", value: moneyIfPositive(pedido.monto) as string }]
      : []),
  ];

  const cargoItems: PdfInfoItem[] = CHARGES.flatMap((charge) => {
    const value = moneyIfPositive(pedido[charge.key] as string | null | undefined);
    return value === undefined ? [] : [{ label: charge.label, value }];
  });

  return (
    <DocumentPdfLayout
      company={company}
      descriptor={pedidoPdfDescriptor(pedido)}
      title="Pedido"
      subtitle={cliente}
      date={{ label: "Fecha", value: formatShortDate(pedido.created_at) }}
      footerDetail={cliente}
    >
      <PdfCardRow>
        <PdfInfoCard title="DATOS DEL PEDIDO" items={pedidoItems} />
        <PdfInfoCard title="DATOS DE FACTURACIÓN" items={clienteItems} />
      </PdfCardRow>

      <PdfCardRow>
        <PdfInfoCard title="DATOS DE ENVÍO" items={envioItems} />
        <PdfInfoCard title="PAGO Y CONTACTO" items={pagoItems} />
      </PdfCardRow>

      <PdfLineItemsTable
        title="PRODUCTOS"
        rows={detalles}
        columns={lineColumns}
        emptyMessage="Este pedido no tiene líneas de producto."
      />

      {servicios.length > 0 ? (
        <PdfLineItemsTable
          title="SERVICIOS EXTRA"
          rows={servicios}
          columns={serviceColumns}
          emptyMessage="Este pedido no tiene servicios extra."
        />
      ) : null}

      {cargoItems.length > 0 ? (
        <PdfCardRow>
          <PdfInfoCard title="CARGOS ADICIONALES" items={cargoItems} />
        </PdfCardRow>
      ) : null}

      <PdfTotals
        rows={[
          // Las piezas NO son un dato contable: llegan siempre.
          { label: "Piezas totales", value: totalPiezas.toLocaleString("es-MX") },
          { label: "Subtotal", value: moneyIfPresent(pedido.subtotal) },
          { label: "Descuento global", value: moneyIfPositive(pedido.descuento_global) },
          { label: "IEPS", value: moneyIfPositive(pedido.ieps) },
          // Mismo lugar que en pantalla: entre los cargos y el IVA.
          { label: "Moneda", value: currency ? (currency.label ?? "-") : undefined },
          {
            label: pedido.iva === undefined ? "IVA" : `IVA (${pedido.iva}%)`,
            value: moneyIfPresent(pedido.importe_iva),
          },
          { label: "TOTAL", value: moneyIfPresent(pedido.gran_total), emphasis: true },
        ]}
      />

      <PdfNotes text={pedido.observaciones} />
      <PdfNotes title="COMENTARIOS DE PARCIALIDAD" text={pedido.comentarios_parcialidad} />
    </DocumentPdfLayout>
  );
};
