// src/__test__/configuracion-drive.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../lib/api", () => ({ apiFetch: vi.fn() }));

const API = "../lib/api";
const REPO = "../lib/configuracion-drive";

describe("configuracion-drive", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  describe("guardarConfiguracionDrive", () => {
    it("hace PUT y devuelve los datos", async () => {
      const api = await import(API);
      (api.apiFetch as any).mockResolvedValue({ 
        ok: true, 
        datos: { carpeta_nombre: "QA" } 
      });

      const { guardarConfiguracionDrive } = await import(REPO);
      const r = await guardarConfiguracionDrive("https://drive.google.com/...");

      expect(api.apiFetch).toHaveBeenCalledWith("/configuracion/drive", {
        metodo: "PUT",
        servicio: "bandeja",
        cuerpo: { enlace: "https://drive.google.com/..." },
      });
      expect(r.carpeta_nombre).toBe("QA");
    });

    it("lanza error si la API falla", async () => {
      const api = await import(API);
      (api.apiFetch as any).mockResolvedValue({ 
        ok: false, 
        motivo: "Carpeta no existe" 
      });

      const { guardarConfiguracionDrive } = await import(REPO);
      await expect(
        guardarConfiguracionDrive("https://drive.google.com/...")
      ).rejects.toThrow("Carpeta no existe");
    });
  });

  describe("obtenerConfiguracionDrive", () => {
    it("hace GET y devuelve los datos", async () => {
      const api = await import(API);
      (api.apiFetch as any).mockResolvedValue({ 
        ok: true, 
        datos: { configurado: true } 
      });

      const { obtenerConfiguracionDrive } = await import(REPO);
      const r = await obtenerConfiguracionDrive();

      expect(api.apiFetch).toHaveBeenCalledWith("/configuracion/drive", {
        metodo: "GET",
        servicio: "bandeja",
      });
      expect(r.configurado).toBe(true);
    });

    it("lanza error si la API falla", async () => {
      const api = await import(API);
      (api.apiFetch as any).mockResolvedValue({ 
        ok: false, 
        motivo: "Sin config" 
      });

      const { obtenerConfiguracionDrive } = await import(REPO);
      await expect(obtenerConfiguracionDrive()).rejects.toThrow("Sin config");
    });
  });
});