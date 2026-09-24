"use client";

import { useHoraLima } from "@/lib/hora-lima";
import styles from "./login.module.css";

export function StationClock() {
  const hora = useHoraLima();

  return (
    <span className={styles.clock} suppressHydrationWarning>
      Lima {hora ?? "--:--:--"}
    </span>
  );
}
