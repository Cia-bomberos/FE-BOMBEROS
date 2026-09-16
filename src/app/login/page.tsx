import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BackdropVideo } from "./BackdropVideo";
import { LoginForm } from "./LoginForm";
import { StationClock } from "./StationClock";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Acceso institucional",
  description:
    "Ingreso al sistema de gestión institucional de la Compañía de Bomberos Voluntarios France N°3.",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      {/* Telón cinematográfico: emblema 3D, brasas y capas de atenuación */}
      <div className={styles.stage} aria-hidden="true">
        <BackdropVideo />
        <div className={styles.scrim} />
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
          <div className={`${styles.eyebrow} ${styles.enter}`}>
            <span className={styles.eyebrowRule} />
            <span className={styles.eyebrowText}>
              CGBVP · Perú · Fundada en 1866
            </span>
          </div>

          <div
            className={`${styles.crest} ${styles.enter}`}
            style={{ "--d": "80ms" } as React.CSSProperties}
          >
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
              <span className={styles.crestKicker}>
                Compañía de Bomberos Voluntarios
              </span>
              <span className={styles.crestName}>France N°3</span>
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

          <p
            className={`${styles.lede} ${styles.enter}`}
            style={{ "--d": "360ms" } as React.CSSProperties}
          >
            Plataforma de <strong>gestión institucional</strong>: bandeja
            documental con trazabilidad total y tablero de mando para la
            Jefatura y el Cuadro de Oficiales.
          </p>
        </section>

        {/* ---------- Panel de acceso ---------- */}
        <section className={styles.panel}>
          <div
            className={`${styles.card} ${styles.enter}`}
            style={{ "--d": "520ms" } as React.CSSProperties}
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
        <span className={styles.footCopy}>
          © {new Date().getFullYear()} Compañía France N°3
          <span className={styles.footDept}> · Administración</span>
        </span>
        <nav className={styles.footNav}>
          <Link href="/soporte">Soporte</Link>
          <Link href="/reglamento">Reglamento de uso</Link>
          <Link href="/privacidad">Privacidad</Link>
        </nav>
        <StationClock />
      </footer>
    </main>
  );
}
