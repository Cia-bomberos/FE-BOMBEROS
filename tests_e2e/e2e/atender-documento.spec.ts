import { test, expect } from '@playwright/test';
import path from 'node:path';

test('Atender Documento Directamente', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/login');
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

  // La app te lleva directamente al detalle.
  // Esperar a la pestaña "Cambiar estado".
  const tabCambiarEstado = page.getByRole('tab', { name: /cambiar estado/i });
  await expect(tabCambiarEstado).toBeVisible({ timeout: 15000 });
  await tabCambiarEstado.click();

  // El desplegable es un <button role="combobox">, no un <select>.
  // Como no tiene aria-label, lo buscamos por su rol (es el único combobox
  // en esta pestaña).
  const desplegableEstado = page.getByRole('combobox').first();
  await expect(desplegableEstado).toBeVisible({ timeout: 10000 });
  await desplegableEstado.click();

  // Seleccionar la opción "Atendido".
  await page.getByRole('option', { name: 'Atendido' }).click();

  // Guardar.
  await page.getByRole('button', { name: /guardar estado/i }).click();

  // Verificar el cambio.
  await expect(page.getByText('Atendido').first()).toBeVisible();
});