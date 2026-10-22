import { test, expect } from '@playwright/test';

test('Registrar Ingreso Interno', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill('administracion');
  await page.getByLabel('Contraseña').fill('Administracion123');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });

  await page.getByRole('link', { name: 'Registrar ingreso' }).click();
  await expect(page.getByRole('heading', { name: 'Registrar documento' })).toBeVisible();

  await page.getByLabel('Tipo documental').click();
  await page.getByText('Oficio', { exact: true }).click();

  await page.getByLabel('Asunto').pressSequentially('Solicitud de equipamiento interno', { delay: 100 });
  await page.getByLabel('Plazo de atención').fill('2026-10-30');
  await page.locator('input[type="file"]').setInputFiles('./tests/test.pdf');
  
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Registrar documento' }).click();

  await expect(page).toHaveURL(/.*\/documentos\/.+/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/OFICIO/i, { timeout: 10000 });
  await expect(page.getByText(/pendiente/i).first()).toBeVisible();

  await page.waitForTimeout(4000); 
});
