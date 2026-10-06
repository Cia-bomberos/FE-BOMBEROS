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

/**
 * Config que publica MS-BANDEJA-BOMBEROS en cada deploy
 * (`scripts/publicar_config.py`), en su propio bucket. Sin fallback a
 * `.env`: la URL de la bandeja solo sale de aquí. Si la descarga falla
 * devuelve `null` y no se cachea, para reintentar en la próxima petición.
 */
export type ConfigBandeja = {
  stage: string;
  apiUrl: string;
  documentsBucket?: string;
};

const BANDEJA_CONFIG_URL = `https://bomberos-f3-bandeja-config-${STAGE}.s3.amazonaws.com/bandeja-config.json`;

let cacheBandeja: ConfigBandeja | null = null;

export async function obtenerConfigBandeja(): Promise<ConfigBandeja | null> {
  if (cacheBandeja) return cacheBandeja;

  try {
    const respuesta = await fetch(BANDEJA_CONFIG_URL, { cache: "no-store" });

    if (!respuesta.ok) {
      throw new Error(`Error leyendo bandeja-config.json: ${respuesta.status} ${respuesta.statusText}`);
    }

    const config = (await respuesta.json()) as ConfigBandeja;
    if (!config?.apiUrl) throw new Error("bandeja-config.json no trae apiUrl");

    cacheBandeja = config;
    return cacheBandeja;
  } catch (error) {
    console.error(`Falló la descarga de ${BANDEJA_CONFIG_URL}:`, error);
    return null;
  }
}
