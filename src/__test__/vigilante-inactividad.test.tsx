import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { VigilanteInactividad } from "../app/panel/VigilanteInactividad";

const MINUTO = 60 * 1000;

describe("VigilanteInactividad", () => {
  let submit: ReturnType<typeof vi.spyOn>;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({ redirected: false });
    global.fetch = fetchMock as any;
    submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const avanzar = (ms: number) =>
    act(() => {
      vi.advanceTimersByTime(ms);
    });

  const formulario = (container: HTMLElement) =>
    container.querySelector("form") as HTMLFormElement;

  it("no avisa durante los primeros 4 minutos", () => {
    render(<VigilanteInactividad />);
    avanzar(4 * MINUTO - 1000);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("avisa en el último minuto con la cuenta regresiva", () => {
    render(<VigilanteInactividad />);
    avanzar(4 * MINUTO + 15_000);
    expect(screen.getByRole("alertdialog")).toHaveTextContent("0:45");
  });

  it("cierra la sesión a los 5 minutos con el formulario de inactividad", () => {
    const { container } = render(<VigilanteInactividad />);
    expect(formulario(container)).toHaveAttribute("action", "/panel/inactividad");
    expect(formulario(container)).toHaveAttribute("method", "post");

    avanzar(5 * MINUTO);
    expect(submit).toHaveBeenCalledTimes(1);

    // Solo una vez, aunque el reloj siga corriendo.
    avanzar(10_000);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("cualquier actividad reinicia la cuenta y oculta el aviso", () => {
    render(<VigilanteInactividad />);
    avanzar(4 * MINUTO + 30_000);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    act(() => {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Seguir conectado" }));
    });
    expect(screen.queryByRole("alertdialog")).toBeNull();

    avanzar(4 * MINUTO);
    expect(submit).not.toHaveBeenCalled();
  });

  it("la actividad después del límite no revive la sesión", () => {
    render(<VigilanteInactividad />);
    // Pestaña dormida: el reloj avanza sin que corran los intervalos.
    vi.setSystemTime(Date.now() + 6 * MINUTO);
    fireEvent.keyDown(window, { key: "a" });
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("toma en cuenta la actividad de otras pestañas", () => {
    render(<VigilanteInactividad />);
    avanzar(4 * MINUTO + 30_000);
    localStorage.setItem("f3_ultima_actividad", String(Date.now()));
    avanzar(1000);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("avisa al servidor de la actividad sin pasar de un pulso cada 30 s", async () => {
    render(<VigilanteInactividad />);

    avanzar(10_000);
    fireEvent.keyDown(window, { key: "a" });
    avanzar(5_000);
    fireEvent.keyDown(window, { key: "b" });

    // La carga de la página ya cuenta como pulso: el siguiente espera.
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/panel/actividad",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("se detiene si el servidor ya cerró la sesión", async () => {
    // Un hash en la misma página: jsdom no implementa cambiar de documento.
    fetchMock.mockResolvedValue({
      redirected: true,
      url: `${window.location.href.split("#")[0]}#login`,
    });

    render(<VigilanteInactividad />);
    avanzar(2_000);
    fireEvent.keyDown(window, { key: "a" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Ya navegó al login: no repite el cierre ni vuelve a avisar.
    avanzar(6 * MINUTO);
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("revisa al volver a la pestaña", () => {
    render(<VigilanteInactividad />);
    vi.setSystemTime(Date.now() + 6 * MINUTO);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
