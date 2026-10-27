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

  // 1. Esperar a que la app te lleve a la lista de documentos
  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental\/documentos/, { timeout: 15000 });

  // 2. Hacer clic en el documento que acabamos de crear para ir a su detalle
  //    (buscamos por el asunto único que le pusimos)
  await page.getByRole('link', { name: /Prueba E2E Atender Directo/i }).click();

  // 3. AHORA SÍ, estamos en la página de detalle.
  //    Esperar a la pestaña "Cambiar estado" y hacer clic
  const tabCambiarEstado = page.getByRole('tab', { name: /cambiar estado/i });
  await expect(tabCambiarEstado).toBeVisible({ timeout: 10000 });
  await tabCambiarEstado.click();

  // 4. Seleccionar "Atendido" en el select nativo
  await page.locator('select[name="estado"]').selectOption('Atendido');

  // 5. Guardar
  await page.getByRole('button', { name: /guardar estado/i }).click();

  // 6. Verificar el cambio
  await expect(page.getByText('Atendido').first()).toBeVisible();
});