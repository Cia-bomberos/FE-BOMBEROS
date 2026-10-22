import { test, expect } from '@playwright/test';
import path from 'node:path';

test('Atender Documento Directamente', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('https://uat-bomberos.ingsoftware.lat/login');
  await page.getByLabel('USUARIO').fill('maquinas');
  await page.getByLabel('CONTRASEÑA').fill('Maquinas123');
  await page.getByRole('button', { name: /INGRESAR AL SISTEMA/i }).click();

  await expect(page).toHaveURL(/.*panel/);
  await page.getByRole('link', { name: /REGISTRAR INGRESO/i }).click();

  await page.locator('#tipo').click();
  await page.getByRole('option', { name: 'Oficio' }).click();

  await page.getByPlaceholder('Descripción breve del contenido').fill('Prueba E2E Atender Directo');
  await page.getByLabel('PLAZO DE ATENCIÓN').fill('2026-11-20');
  await page.locator('input[type="file"]').setInputFiles(
    path.join(__dirname, '..', 'fixtures', 'test.pdf')
  );
  await page.getByRole('button', { name: /REGISTRAR DOCUMENTO/i }).click();

  await expect(page.getByText('PENDIENTE').first()).toBeVisible();

  // Cambiar estado a atendido (como la única opción ya viene seleccionada, solo hacemos clic en marcar)
  await page.click('text=CAMBIAR ESTADO');
  await page.getByRole('button', { name: 'MARCAR COMO ATENDIDO' }).click();

  await expect(page.getByText('ATENDIDO').first()).toBeVisible();
});
