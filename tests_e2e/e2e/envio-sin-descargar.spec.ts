import { test, expect } from '@playwright/test';
import path from 'node:path';

test('Bloqueo al intentar Envío Externo sin descargar el PDF antes', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('https://uat-bomberos.ingsoftware.lat/login');
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

  await expect(page.getByText('PENDIENTE').first()).toBeVisible();

  // Ir a Envío Externo sin descargar
  await page.click('text=ENVÍO EXTERNO');
  
  // Llenar la entidad destinataria para evitar el error de campo vacío
  await page.getByPlaceholder('CGBVP · IV Comandancia').fill('CGBVP - IV Comandancia');
  
  await page.getByRole('button', { name: 'REGISTRAR ENVÍO' }).click();

  // Validar el mensaje de alerta exacto de la barra roja
  await expect(page.getByText('Debe descargar el documento antes de registrar su envío externo.')).toBeVisible();
});
