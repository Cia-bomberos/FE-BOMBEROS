// src/__test__/proxy-csp.test.ts
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

async function frameAncestors(ruta: string) {
  const respuesta = await proxy(new NextRequest(`http://localhost${ruta}`));
  return /frame-ancestors ([^;]+);/.exec(
    respuesta.headers.get("content-security-policy") ?? "",
  )?.[1];
}

describe("proxy: quién puede mostrarse en un iframe", () => {
  it("el visor del PDF solo dentro del propio sitio", async () => {
    expect(await frameAncestors("/panel/bandeja-documental/documentos/123/ver")).toBe("'self'");
  });

  it.each([
    "/login",
    "/panel",
    "/panel/bandeja-documental/documentos/123",
    "/panel/bandeja-documental/documentos/123/descargar",
    "/panel/bandeja-documental/documentos/123/ver/otra",
    "/panel/bandeja-documental/documentos/ver",
    "/otra/panel/bandeja-documental/documentos/123/ver",
  ])("%s en ninguno", async (ruta) => {
    expect(await frameAncestors(ruta)).toBe("'none'");
  });
});
