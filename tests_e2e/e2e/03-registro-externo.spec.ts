import { test, expect } from '@playwright/test';

const USER = process.env.E2E_USER ?? 'administracion';
const PASS = process.env.E2E_PASS ?? 'Administracion123';

test('Registrar Ingreso Externo', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(USER);
  await page.getByLabel('Contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });

  await page.getByRole('link', { name: 'Registrar ingreso' }).click();
  await expect(page.getByRole('heading', { name: 'Registrar documento' })).toBeVisible();

  await page.getByLabel('Procedencia').click();
  await page.getByRole('option', { name: 'Externo · otra entidad' }).click();

  await page.getByLabel('Asunto').fill('Solicitud de inspección externa de local');
  await page.getByLabel('Plazo de atención').fill('2026-11-15');
  await page.locator('input[type="file"]').setInputFiles('../test.pdf');

  await page.getByRole('button', { name: 'Registrar documento' }).click();

  await expect(page).toHaveURL(/.*\/documentos\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/EXTERNO/i, { timeout: 10000 });
  await expect(page.getByText('Documento registrado (simplificado)')).toBeVisible();
  await expect(page.getByText(/pendiente/i).first()).toBeVisible();
});