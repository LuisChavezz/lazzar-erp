import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { stripPdfEmoji, stripPdfEmojiDeep } from "@/src/pdfs/shared/stripPdfEmoji";

/**
 * EC-958: ninguna fuente de los PDF tiene emoji, así que `renderPdfBlobWith`
 * los quita de las props antes de renderizar. Se quitan los emoji (fuera del
 * BMP, secuencias, banderas, tonos) y se conservan los símbolos que la pila
 * Arimo + respaldo sí imprime, con el resto del texto intacto.
 */

test.describe("stripPdfEmoji", () => {
  test("quita emoji sueltos sin tocar el texto que los rodea", () => {
    expect(stripPdfEmoji("Entrega 🚚 hoy")).toBe("Entrega  hoy");
    expect(stripPdfEmoji("Listo😀")).toBe("Listo");
    expect(stripPdfEmoji("📦 Caja 3 🔥")).toBe(" Caja 3 ");
  });

  test("quita secuencias completas: ZWJ, tono de piel, banderas, etiquetas y VS16", () => {
    expect(stripPdfEmoji("Equipo 👨‍👩‍👧 ok")).toBe("Equipo  ok");
    expect(stripPdfEmoji("Bien 👍🏽.")).toBe("Bien .");
    expect(stripPdfEmoji("Hecho en 🇲🇽!")).toBe("Hecho en !");
    expect(stripPdfEmoji("Escocia 🏴󠁧󠁢󠁳󠁣󠁴󠁿 fin")).toBe("Escocia  fin");
    expect(stripPdfEmoji("Atleta ⛹️‍♂️ fin")).toBe("Atleta  fin");
    expect(stripPdfEmoji("❤️‍🔥 pasión")).toBe(" pasión");
    expect(stripPdfEmoji("tono suelto 🏽 y RI suelto 🇲")).toBe("tono suelto  y RI suelto ");
  });

  test("conserva los símbolos que el PDF imprime, sin su selector de variación", () => {
    expect(stripPdfEmoji("✓ ✔ ✗ ⇒ ★ ① ⚠ ❤ ⭐ © ™")).toBe("✓ ✔ ✗ ⇒ ★ ① ⚠ ❤ ⭐ © ™");
    expect(stripPdfEmoji("Cuidado ⚠️ frágil ❤️")).toBe("Cuidado ⚠ frágil ❤");
    expect(stripPdfEmoji("Texto ☺︎")).toBe("Texto ☺");
  });

  test("de una tecla deja solo el carácter, y no toca dígitos ni # normales", () => {
    expect(stripPdfEmoji("Paso 1️⃣ y #️⃣")).toBe("Paso 1 y #");
    expect(stripPdfEmoji("Pedido #12 de 3*4 = 12")).toBe("Pedido #12 de 3*4 = 12");
  });

  test("no cambia texto sin emoji: acentos, ×, —, €, comillas y una ZWJ fuera de emoji", () => {
    for (const texto of [
      "Camisa ÑANDÚ — 3 × 4 = 12 € · “urgente” ≥ 2 ½",
      "क्‍ष",
      "",
      "   ",
    ]) {
      expect(stripPdfEmoji(texto)).toBe(texto);
    }
  });
});

test.describe("stripPdfEmojiDeep", () => {
  test("recorre objetos y arrays planos y deja intactos los valores que no son texto", () => {
    const fecha = new Date("2026-11-24T00:00:00Z");
    const blob = new Blob(["x"]);
    const elemento = createElement("span", null, "😀");
    class Modelo {
      texto = "😀";
    }
    const modelo = new Modelo();
    const props = {
      pedido: {
        observaciones: "Urgente 🚚 ✓",
        cantidad: 3,
        precio: 12.5,
        activo: true,
        nada: null,
        indefinido: undefined,
        detalles: [{ producto_nombre: "Camisa ⭐ 👍🏽" }, "suelto 🔥", 7],
        fecha,
      },
      imagen: "data:image/png;base64,iVBORw0KGgo=",
      url: "https://example.com/😀.png",
      blob,
      elemento,
      modelo,
    };

    const limpio = stripPdfEmojiDeep(props);

    expect(limpio.pedido.observaciones).toBe("Urgente  ✓");
    expect(limpio.pedido.detalles).toEqual([{ producto_nombre: "Camisa ⭐ " }, "suelto ", 7]);
    expect(limpio.pedido.cantidad).toBe(3);
    expect(limpio.pedido.precio).toBe(12.5);
    expect(limpio.pedido.activo).toBe(true);
    expect(limpio.pedido.nada).toBeNull();
    expect(limpio.pedido.indefinido).toBeUndefined();
    expect(limpio.pedido.fecha).toBe(fecha);
    expect(limpio.imagen).toBe(props.imagen);
    expect(limpio.url).toBe(props.url);
    expect(limpio.blob).toBe(blob);
    expect(limpio.elemento).toBe(elemento);
    expect(limpio.modelo).toBe(modelo);
    // No muta lo que recibe.
    expect(props.pedido.observaciones).toBe("Urgente 🚚 ✓");
  });

  test("un texto que empieza con un enlace se limpia como cualquier otro; una URL sola no", () => {
    expect(stripPdfEmojiDeep({ notas: "https://drive.example/x revisar 🚚 urgente" }).notas).toBe(
      "https://drive.example/x revisar  urgente",
    );
    expect(stripPdfEmojiDeep({ url: "https://example.com/😀.png" }).url).toBe("https://example.com/😀.png");
  });
});
