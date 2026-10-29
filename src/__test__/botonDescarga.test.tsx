// src/app/panel/bandeja-documental/documentos/[id]/BotonDescarga.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("../../../iconos", () => ({
  IconDescarga: () => <span data-testid="icon-descarga" />,
}));

import { BotonDescarga } from "@/app/panel/bandeja-documental/documentos/[id]/BotonDescarga";

describe("BotonDescarga", () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("renderiza el botón con el texto 'Descargar' y el svg del icono", () => {
    render(<BotonDescarga id="doc-1" numero="001-2026" />);
    const boton = screen.getByRole("button", { name: /Descargar/i });
    expect(boton).toBeTruthy();
    expect(boton.querySelector("svg")).toBeTruthy();
  });

  it("descarga el PDF y hace click en el enlace temporal", async () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(blob),
    } as any);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<BotonDescarga id="doc-1" numero="001-2026" />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/panel/bandeja-documental/documentos/doc-1/descargar",
      );
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("deshabilita el botón mientras descarga y muestra 'Descargando…'", async () => {
    let resolver: (v: any) => void = () => {};
    global.fetch = vi.fn(
      () => new Promise((res) => { resolver = res; }),
    ) as any;

    render(<BotonDescarga id="doc-1" numero="001-2026" />);
    const boton = screen.getByRole("button", { name: /Descargar/i });
    fireEvent.click(boton);

    // El botón pasa a "Descargando…" y queda disabled
    const durante = await screen.findByRole("button", { name: /Descargando/i });
    expect((durante as HTMLButtonElement).disabled).toBe(true);
    expect(durante.getAttribute("title")).toBe("Descargando…");

    resolver({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    });
  });

  it("si la respuesta no es ok, no descarga y vuelve a habilitarse", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<BotonDescarga id="doc-1" numero="001-2026" />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Descargar/i })).toBeTruthy();
    });

    expect(clickSpy).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: /Descargar/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("si fetch lanza excepción, no rompe y vuelve a habilitarse", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network"));

    render(<BotonDescarga id="doc-1" numero="001-2026" />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Descargar/i })).toBeTruthy();
    });

    expect(
      (screen.getByRole("button", { name: /Descargar/i }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("llama a router.refresh() tras una descarga exitosa", async () => {
    const refresh = vi.fn();
    vi.resetModules();
    vi.doMock("next/navigation", () => ({
      useRouter: () => ({ refresh }),
    }));

    const { BotonDescarga: Componente } = await import("@/app/panel/bandeja-documental/documentos/[id]/BotonDescarga");

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob()),
    } as any);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<Componente id="doc-1" numero="001-2026" />);
    fireEvent.click(screen.getByRole("button", { name: /Descargar/i }));

    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });
});