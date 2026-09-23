import Image from "next/image";
import type { Metadata } from "next";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import { obtenerTema } from "@/lib/tema-servidor";
import { IconShield } from "./icons";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Acceso institucional",
  description:
    "Ingreso al sistema de gestión institucional de la Compañía de Bomberos Voluntarios France N°3.",
};

export default async function LoginPage() {
  const tema = await obtenerTema();

  return (
    <main className={styles.page} data-theme={tema}>
      {/* Telón: negro cinematográfico con brasa, latón y grano */}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.emberWash} />
        <div className={styles.grain} />
      </div>

      <div className={styles.rail} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.shell}>
        {/* ---------- Identidad ---------- */}
        <section className={styles.identity}>
          <div className={`${styles.crest} ${styles.enter}`}>
            <div className={styles.medallion}>
              <div className={styles.medallionInner}>
                <Image
                  src="/logo2.jpg"
                  alt="Escudo de la Compañía de Bomberos France N°3"
                  fill
                  sizes="88px"
                  priority
                />
              </div>
            </div>
            <div className={styles.crestMeta}>
              <span className={styles.crestLine}>CGBVP - Perú</span>
              <span className={styles.crestRule} aria-hidden="true" />
              <span className={styles.crestLine}>Fundada en 1866</span>
            </div>
          </div>

          <h2
            className={`${styles.title} ${styles.enter}`}
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            <span className={styles.titleLine}>France</span>
            <span className={`${styles.titleLine} ${styles.titleAccent}`}>
              N<span className={styles.titleOrd}>°</span>3
            </span>
          </h2>

          <div
            className={`${styles.tricolorRule} ${styles.enter}`}
            style={{ "--d": "240ms" } as React.CSSProperties}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>

          <p
            className={`${styles.motto} ${styles.enter}`}
            style={{ "--d": "300ms" } as React.CSSProperties}
          >
            «&nbsp;Sauver ou Périr&nbsp;»
            <span className={styles.mottoEs}>Salvar o Perecer</span>
          </p>
        </section>

        {/* ---------- Placa de acceso ---------- */}
        <section className={styles.panel}>
          <div
            className={`${styles.card} ${styles.enter}`}
            style={{ "--d": "460ms" } as React.CSSProperties}
          >
            <div className={styles.cardEdge} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span
              className={`${styles.bracket} ${styles.bracketTl}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bracket} ${styles.bracketTr}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bracket} ${styles.bracketBl}`}
              aria-hidden="true"
            />
            <span
              className={`${styles.bracket} ${styles.bracketBr}`}
              aria-hidden="true"
            />

            <LoginForm />
          </div>
        </section>
      </div>

      <footer className={styles.foot}>
        <p className={styles.footNotice}>
          <IconShield />
          <span>
            Sistema de uso exclusivo del personal autorizado de la Compañía.
          </span>
        </p>
        <ToggleTheme inicial={tema} className={styles.toggle} />
      </footer>
    </main>
  );
}
