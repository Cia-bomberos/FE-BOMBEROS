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

  // Esperar a la pestaña "Envío externo" (es un tab, no un button)
   await expect(page).toHaveURL(/.*\/panel\/bandeja-documental\/documentos/, { timeout: 15000 });

  // 2. Ir al detalle del documento creado
  await page.getByRole('link', { name: /Prueba envio sin descarga/i }).click();

  // 3. Ahora sí, buscar la pestaña "Envío externo"
  const tabEnvioExterno = page.getByRole('tab', { name: /envío externo/i });
  await expect(tabEnvioExterno).toBeVisible({ timeout: 10000 });
  await tabEnvioExterno.click();
});