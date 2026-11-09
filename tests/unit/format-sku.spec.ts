import { expect, test } from "@playwright/test";
import { formatSku } from "@/src/utils/formatSku";

test("formatSku separa producto/color/talla", () => {
  expect(formatSku("200480128")).toBe("2004/801/28");
  expect(formatSku("2004801")).toBe("2004/801");
  expect(formatSku("60021002XCH")).toBe("6002/100/2XCH");
  expect(formatSku("MP622-302-G")).toBe("MP622-302-G");
  expect(formatSku(null)).toBe("");
});
