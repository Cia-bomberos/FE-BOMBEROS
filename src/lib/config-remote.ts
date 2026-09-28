// lib/config-remota.ts

export type ConfigRemota = {
  stage: string;
  userPoolId: string;
  clientId: string;
  apiUrl: string;
  region: "us-east-1";
};

const STAGE = process.env.STAGE ?? "dev";
const CONFIG_URL = `https://bomberos-config-${STAGE}.s3.amazonaws.com/config.json`;

let cacheConfig: ConfigRemota | null = null;

export async function obtenerConfigRemota(): Promise<ConfigRemota> {
  // Si ya tenemos cache local en memoria, evitamos hacer fetch constante
  if (cacheConfig) return cacheConfig;

  try {
    const respuesta = await fetch(CONFIG_URL, {
      cache: "no-store", // Garantiza leer siempre el estado actual
    });

    if (!respuesta.ok) {
      throw new Error(`Error leyendo configuración remota: ${respuesta.statusText}`);
    }

    cacheConfig = await respuesta.json();
    return cacheConfig!;
  } catch (error) {
    console.error("Falló la descarga de config.json remoto, fallback a .env local:", error);

    // Fallback a variables de entorno locales en caso de fallo de red
    return {
      stage: STAGE,
      userPoolId: process.env.COGNITO_USER_POOL_ID ?? "",
      clientId: process.env.COGNITO_CLIENT_ID ?? "",
      apiUrl: process.env.API_GATEWAY_URL ?? "",
      region: "us-east-1",
    };
  }
}