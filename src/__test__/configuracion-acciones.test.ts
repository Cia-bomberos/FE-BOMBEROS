// src/__test__/configuracion-acciones.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/configuracion-drive", () => ({
  guardarConfiguracionDrive: vi.fn(),
}));

const ACCIONES = "../app/panel/configuracion/actions";

describe("configuracion/actions - actualizarDriveAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza si el enlace no es de Drive", async () => {
    const { actualizarDriveAction } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("enlace", "https://google.com");
    
    const r = await actualizarDriveAction({ estado: "inicial" }, fd);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toMatch(/enlace válido/);
  });

  it("guarda correctamente y retorna mensaje con nombre de carpeta", async () => {
    const api = await import("../lib/configuracion-drive");
    (api.guardarConfiguracionDrive as any).mockResolvedValue({ carpeta_nombre: "Documentos QA" });

    const { actualizarDriveAction } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("enlace", "https://drive.google.com/drive/folders/123");

    const r = await actualizarDriveAction({ estado: "inicial" }, fd);
    expect(r.estado).toBe("ok");
    expect(r.mensaje).toContain("Documentos QA");
  });

  it("maneja el error de la API", async () => {
    const api = await import("../lib/configuracion-drive");
    (api.guardarConfiguracionDrive as any).mockRejectedValue(new Error("Carpeta no existe"));

    const { actualizarDriveAction } = await import(ACCIONES);
    const fd = new FormData();
    fd.set("enlace", "https://drive.google.com/drive/folders/123");

    const r = await actualizarDriveAction({ estado: "inicial" }, fd);
    expect(r.estado).toBe("error");
    expect(r.mensaje).toBe("Carpeta no existe");
  });
});