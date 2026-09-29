// src/__test__/hora-lima.test.tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHoraLima } from "../lib/hora-lima";

describe("useHoraLima", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("arranca en null (para hidratación)", () => {
    const { result } = renderHook(() => useHoraLima());
    expect(result.current).toBe("07:00:00");
  });

  it("rellena la hora tras montar", () => {
    const { result } = renderHook(() => useHoraLima());
    act(() => {
      vi.advanceTimersByTime(0);
    });
    // Formato HH:mm:ss en es-PE, hora Lima (UTC-5)
    expect(result.current).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(result.current).toBe("07:00:00");
  });

  it("avanza cada segundo", () => {
    const { result } = renderHook(() => useHoraLima());
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const inicial = result.current;
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).not.toBe(inicial);
    expect(result.current).toBe("07:00:01");
  });

  it("limpia el intervalo al desmontar", () => {
    const clearSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useHoraLima());
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });
});