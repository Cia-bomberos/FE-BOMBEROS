export type CampoAcceso = "usuario" | "clave" | "nueva" | "confirmacion";

export type EstadoAcceso =
  | { estado: "inicial" }
  | { estado: "error"; mensaje: string; campo?: CampoAcceso }
  /** Primer ingreso: Cognito exige reemplazar la contraseña temporal. */
  | {
      estado: "nueva-clave";
      mensaje?: string;
      campo?: Extract<CampoAcceso, "nueva" | "confirmacion">;
    }
  | { estado: "concedido"; nombre: string; grado: string };

export const estadoInicial: EstadoAcceso = { estado: "inicial" };
