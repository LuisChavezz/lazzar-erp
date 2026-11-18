import { expect, test } from "@playwright/test";
import {
  salidaMaquilaFolio,
  salidaMaquilaOrigenRef,
} from "../../src/features/maquila-outputs/constants/salidaMaquilaOrigen";
import { parseSalidaMaquilaCreateError } from "../../src/features/maquila-outputs/utils/salidaMaquilaErrors";
import type { SalidaMaquilaListItem } from "../../src/features/maquila-outputs/interfaces/salida-maquila.interface";

const sm = (patch: Partial<SalidaMaquilaListItem>): SalidaMaquilaListItem => ({
  id: 9,
  folio: "SM-00001",
  estatus: "ENVIADA",
  estatus_display: "Enviada",
  op: null,
  op_folio: null,
  ob: null,
  ob_folio: null,
  orden_r: null,
  orden_r_folio: null,
  centro_confeccion: 3,
  centro_confeccion_nombre: "Maq",
  sucursal: 6,
  fecha_envio: "2026-11-18",
  fecha_compromiso: null,
  fecha_recepcion: null,
  total_piezas: "2.00",
  observaciones: "",
  usuario: 10,
  created_at: "2026-11-18T09:47:39-06:00",
  ...patch,
});

test.describe("origen de una SM (EC-911)", () => {
  test("una SM de OR enlaza a la OR, no a una OP con el id de la OR", () => {
    expect(salidaMaquilaOrigenRef(sm({ origen: "OR", origen_id: 1, origen_folio: "OR-6", orden_r: 1 }))).toEqual({
      origen: "OR",
      id: 1,
      folio: "OR-6",
    });
    // Sin `origen` se deduce del FK puesto.
    expect(salidaMaquilaOrigenRef(sm({ orden_r: 4, orden_r_folio: "OR-4" }))).toEqual({
      origen: "OR",
      id: 4,
      folio: "OR-4",
    });
    expect(salidaMaquilaOrigenRef(sm({ ob: 2, ob_folio: "OB-2" }))?.origen).toBe("OB");
    expect(salidaMaquilaOrigenRef(sm({ op: 82, op_folio: "OP-82" }))?.origen).toBe("OP");
    expect(salidaMaquilaOrigenRef(sm({}))).toBeNull();
  });

  test("en pantalla va folio_display; folio solo si no viene", () => {
    expect(salidaMaquilaFolio(sm({ folio_display: "SM-00001 · OR-6" }))).toBe("SM-00001 · OR-6");
    expect(salidaMaquilaFolio(sm({}))).toBe("SM-00001");
  });
});

const axios400 = (data: unknown, status = 400) => ({ isAxiosError: true, response: { status, data } });

test.describe("errores del alta de SM (EC-911)", () => {
  test("string plano del tope y del precio van al aviso", () => {
    expect(
      parseSalidaMaquilaCreateError(
        axios400({ detalles: "La salida excede las piezas de la OR: 20.0 programadas, 15.00 ya enviadas a maquila; quedan 5.00." }),
        [31],
        "x",
      ),
    ).toEqual({
      fields: {},
      lines: {},
      messages: ["La salida excede las piezas de la OR: 20.0 programadas, 15.00 ya enviadas a maquila; quedan 5.00."],
    });
    expect(parseSalidaMaquilaCreateError(axios400({ precio_unitario: "Indica el precio." }), [31], "x").messages).toEqual([
      "Indica el precio.",
    ]);
  });

  test("el maquilero va bajo su control; un error de lista del origen, al aviso", () => {
    const r = parseSalidaMaquilaCreateError(
      axios400({ centro_confeccion: ["Indica el centro de confección (la OR no tiene)."], orden_r: ["La OR está cancelada."] }),
      [],
      "x",
    );
    expect(r.fields).toEqual({ centro_confeccion: "Indica el centro de confección (la OR no tiene)." });
    expect(r.messages).toEqual(["La OR está cancelada."]);
  });

  test("un error anidado por índice cae en el renglón que se envió en esa posición", () => {
    const r = parseSalidaMaquilaCreateError(
      axios400({ detalles: { "1": { or_detalle: ['Clave primaria "4" inválida - objeto no existe.'] } } }),
      [31, 33],
      "x",
    );
    expect(r.lines).toEqual({ 33: 'Clave primaria "4" inválida - objeto no existe.' });
    expect(r.messages).toEqual(["Revisa los renglones marcados."]);
  });

  test("también en forma de lista alineada, y un índice sin renglón sale numerado", () => {
    const r = parseSalidaMaquilaCreateError(
      axios400({ detalles: [{}, { cantidad: ["Mayor que 0."] }, { cantidad: ["Otro."] }] }),
      [31, 33],
      "x",
    );
    expect(r.lines).toEqual({ 33: "Mayor que 0." });
    expect(r.messages).toEqual(["Renglón 3: Otro."]);
  });

  test("lista de mensajes en detalles (renglón de otra orden) va al aviso", () => {
    expect(
      parseSalidaMaquilaCreateError(axios400({ detalles: ["Un renglón no pertenece a la OR."] }), [31], "x").messages,
    ).toEqual(["Un renglón no pertenece a la OR."]);
  });

  test("403 y cuerpos sin mensajes", () => {
    expect(parseSalidaMaquilaCreateError(axios400({ detail: "Acción disponible solo para producción." }, 403), [], "x").messages).toEqual([
      "No tienes permiso de Producción para esta acción.",
    ]);
    expect(parseSalidaMaquilaCreateError(axios400("<html>"), [], "No se pudo generar la salida.").messages).toHaveLength(1);
  });
});
