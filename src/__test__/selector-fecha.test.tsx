// src/__test__/selector-fecha.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SelectorFecha } from "../components/ui/selector-fecha";

function montar(props: Partial<React.ComponentProps<typeof SelectorFecha>> = {}) {
  const onCambio = vi.fn();
  const { container } = render(
    <SelectorFecha nombre="plazo" etiqueta="Plazo" onCambio={onCambio} {...props} />,
  );
  return {
    onCambio,
    entrada: screen.getByLabelText("Plazo") as HTMLInputElement,
    oculto: container.querySelector('input[name="plazo"]') as HTMLInputElement,
  };
}

const escribir = (entrada: HTMLInputElement, value: string) =>
  fireEvent.change(entrada, { target: { value } });

const abrirCalendario = () =>
  fireEvent.click(screen.getByRole("button", { name: "Abrir calendario" }));

describe("SelectorFecha", () => {
  beforeEach(() => {
    // 6 de noviembre de 2026 a las 12:00 en Lima.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-06T17:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  /* ---------------- Escritura ---------------- */

  it("muestra dd/mm/aaaa y envía aaaa-mm-dd", () => {
    const { entrada, oculto, onCambio } = montar();
    expect(entrada.placeholder).toBe("dd/mm/aaaa");

    escribir(entrada, "25112026");

    expect(entrada.value).toBe("25/11/2026");
    expect(oculto.value).toBe("2026-11-25");
    expect(onCambio).toHaveBeenLastCalledWith("2026-11-25");
  });

  it.each([
    ["2511", "25/11"],
    ["25/", "25"],
    ["5/", "05"],
    ["5/1/2026", "05/01/2026"],
    ["abc", ""],
    ["25/11/20261", "25/11/2026"],
  ])("da formato a %s", (escrito, esperado) => {
    const { entrada } = montar();
    escribir(entrada, escrito);
    expect(entrada.value).toBe(esperado);
  });

  it("interpreta 03/04 como 3 de abril", () => {
    const { entrada, oculto } = montar();
    escribir(entrada, "03042026");
    expect(oculto.value).toBe("2026-04-03");
  });

  it("acepta el 29 de febrero solo en año bisiesto", () => {
    const { entrada, oculto } = montar();
    escribir(entrada, "29022028");
    expect(oculto.value).toBe("2028-02-29");
    escribir(entrada, "29022027");
    expect(oculto.value).toBe("29/02/2027");
  });

  /* ---------------- Validación ---------------- */

  it.each(["31022026", "00112026", "25132026"])(
    "rechaza la fecha imposible %s sin vaciar el valor enviado",
    (escrito) => {
      const { entrada, oculto, onCambio } = montar();
      escribir(entrada, escrito);

      expect(oculto.value).toContain("/");
      expect(onCambio).toHaveBeenLastCalledWith(entrada.value);
      expect(entrada.getAttribute("aria-invalid")).toBe("true");
      expect(screen.getByRole("alert").textContent).toMatch(/Fecha no válida/);
    },
  );

  it("avisa de una fecha incompleta solo al salir del campo", () => {
    const { entrada, oculto } = montar();
    fireEvent.focus(entrada);
    escribir(entrada, "2511");
    expect(screen.queryByRole("alert")).toBeNull();

    fireEvent.blur(entrada);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(oculto.value).toBe("25/11");
  });

  it("vacío no avisa ni envía nada", () => {
    const { entrada, oculto } = montar();
    fireEvent.blur(entrada);
    expect(oculto.value).toBe("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("marca el error que llega del formulario", () => {
    const { entrada } = montar({ invalido: true });
    expect(entrada.getAttribute("aria-invalid")).toBe("true");
  });

  it("deshabilita el campo y el calendario", () => {
    const { entrada } = montar({ disabled: true });
    expect(entrada.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Abrir calendario" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  /* ---------------- Calendario ---------------- */

  it("abre en el mes actual de Lima y en español", () => {
    montar();
    abrirCalendario();
    expect(screen.getByRole("dialog").textContent).toMatch(/noviembre de 2026/);
    expect(screen.getByRole("columnheader", { name: "Lu" })).toBeTruthy();
    const hoy = screen.getByRole("button", { name: "6 de noviembre de 2026" });
    expect(hoy.getAttribute("aria-current")).toBe("date");
    expect(document.activeElement).toBe(hoy);
  });

  it("empieza la semana en lunes", () => {
    montar();
    abrirCalendario();
    // Noviembre de 2026 empieza en domingo: la fila arranca el lunes 26/10.
    const primerDia = screen.getAllByRole("gridcell")[0].querySelector("button");
    expect(primerDia?.getAttribute("aria-label")).toBe("26 de octubre de 2026");
  });

  it("elegir un día lo escribe, cierra y devuelve el foco", () => {
    const { entrada, oculto, onCambio } = montar();
    abrirCalendario();
    fireEvent.click(screen.getByRole("button", { name: "25 de noviembre de 2026" }));

    expect(entrada.value).toBe("25/11/2026");
    expect(oculto.value).toBe("2026-11-25");
    expect(onCambio).toHaveBeenLastCalledWith("2026-11-25");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Abrir calendario" }),
    );
  });

  it("abre en la fecha escrita y la marca como elegida", () => {
    const { entrada } = montar();
    escribir(entrada, "15032027");
    abrirCalendario();

    expect(screen.getByRole("dialog").textContent).toMatch(/marzo de 2027/);
    const celda = screen.getByRole("button", { name: "15 de marzo de 2027" }).closest("td");
    expect(celda?.getAttribute("aria-selected")).toBe("true");
  });

  it("los botones de mes navegan sin quitar el foco", () => {
    montar();
    abrirCalendario();
    const siguiente = screen.getByRole("button", { name: "Mes siguiente" });
    siguiente.focus();

    fireEvent.click(siguiente);
    expect(screen.getByRole("dialog").textContent).toMatch(/diciembre de 2026/);
    expect(document.activeElement).toBe(siguiente);

    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
    expect(screen.getByRole("dialog").textContent).toMatch(/octubre de 2026/);
  });

  it("al cambiar de mes usa el último día si el actual no existe", () => {
    const { entrada } = montar();
    escribir(entrada, "31012027");
    abrirCalendario();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));

    expect(screen.getByRole("dialog").textContent).toMatch(/febrero de 2027/);
    expect(
      screen.getByRole("button", { name: "28 de febrero de 2027" }).getAttribute("tabindex"),
    ).toBe("0");
  });

  it.each([
    ["ArrowRight", "7 de noviembre de 2026"],
    ["ArrowLeft", "5 de noviembre de 2026"],
    ["ArrowDown", "13 de noviembre de 2026"],
    ["ArrowUp", "30 de octubre de 2026"],
    ["Home", "2 de noviembre de 2026"],
    ["End", "8 de noviembre de 2026"],
    ["PageDown", "6 de diciembre de 2026"],
    ["PageUp", "6 de octubre de 2026"],
  ])("%s lleva a %s", (tecla, destino) => {
    montar();
    abrirCalendario();
    fireEvent.keyDown(document.activeElement as Element, { key: tecla });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(destino);
  });

  it("Escape cierra y devuelve el foco al botón", () => {
    montar();
    abrirCalendario();
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Abrir calendario" }),
    );
  });

  it("clic fuera cierra", () => {
    montar();
    abrirCalendario();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("foco fuera cierra", () => {
    render(<button type="button">Otro</button>);
    montar();
    abrirCalendario();
    fireEvent.focusIn(screen.getByRole("button", { name: "Otro" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Hoy elige la fecha de Lima", () => {
    const { entrada, oculto } = montar();
    abrirCalendario();
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(entrada.value).toBe("06/11/2026");
    expect(oculto.value).toBe("2026-11-06");
  });

  it("Limpiar borra la fecha", () => {
    const { entrada, oculto, onCambio } = montar();
    escribir(entrada, "25112026");
    abrirCalendario();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(entrada.value).toBe("");
    expect(oculto.value).toBe("");
    expect(onCambio).toHaveBeenLastCalledWith("");
  });

  it("no envía el formulario al usar el calendario", () => {
    const alEnviar = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={alEnviar}>
        <SelectorFecha nombre="plazo" etiqueta="Plazo" />
      </form>,
    );
    abrirCalendario();
    fireEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Hoy" }));
    expect(alEnviar).not.toHaveBeenCalled();
  });
});
