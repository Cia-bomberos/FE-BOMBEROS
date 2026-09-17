import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Acceso institucional",
  description:
    "Ingreso al sistema de gestión institucional de la Compañía de Bomberos Voluntarios France N°3.",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.cardHeader}>
        <Image
          src="/logo2.jpg"
          alt="Compañía de Bomberos Voluntarios France N°3"
          width={80}
          height={80}
          priority
          className={styles.logo}
        />

        <h3 className={styles.cardTitleLogo}>
          Compañia N°3 de Bomberos
        </h3>

      </div>
      <div className={styles.rail} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.shell}>

        {/* ---------- Panel de acceso ---------- */}
        <section className={styles.panel}>
          <div
            className={`${styles.card} ${styles.enter}`}
            style={{ "--d": "520ms" } as React.CSSProperties}
          >
            <LoginForm />
          </div>
        </section>
      </div>

      <footer className={styles.foot}>
        <span className={styles.footCopy}>
          © {new Date().getFullYear()} Compañía France N°3
          <span className={styles.footDept}> · Administración</span>
        </span>
      </footer>
    </main>
  );
}
