import { test, expect } from '@playwright/test';
import path from 'node:path';

test('Bloqueo al intentar Envío Externo sin descargar el PDF antes', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/login');
  await page.getByLabel('USUARIO').fill('maquinas');
  await page.getByLabel('CONTRASEÑA').fill('Maquinas123');
  await page.getByRole('button', { name: /INGRESAR AL SISTEMA/i }).click();

  await page.getByRole('link', { name: /REGISTRAR INGRESO/i }).click();

  await page.locator('#tipo').click();
  await page.getByRole('option', { name: 'Oficio' }).click();

  await page.getByPlaceholder('Descripción breve del contenido').fill('Prueba envio sin descarga');
  await page.getByLabel('PLAZO DE ATENCIÓN').fill('2026-11-25');
  await page.locator('input[type="file"]').setInputFiles(
    path.join(__dirname, '..', 'fixtures', 'test.pdf')
  );
  await page.getByRole('button', { name: /REGISTRAR DOCUMENTO/i }).click();

  // La app te lleva directamente al detalle del documento.
  // Esperamos a la pestaña "Envío externo".
  const tabEnvioExterno = page.getByRole('tab', { name: /envío externo/i });
  await expect(tabEnvioExterno).toBeVisible({ timeout: 15000 });
  await tabEnvioExterno.click();

  // Llenar la entidad destinataria
  await page.getByPlaceholder('CGBVP · IV Comandancia').fill('CGBVP - IV Comandancia');

  // Intentar registrar el envío (sin haber descargado el PDF)
  await page.getByRole('button', { name: /registrar envío/i }).click();

  // Verificar el mensaje de error del backend
  await expect(
    page.getByText(/Debe descargar el documento antes de registrar su envío externo/i)
  ).toBeVisible();
});