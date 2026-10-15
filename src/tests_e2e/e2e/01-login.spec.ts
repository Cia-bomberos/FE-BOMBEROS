import { test, expect } from '@playwright/test';

const USER = process.env.E2E_USER ?? 'jefatura';
const PASS = process.env.E2E_PASS ?? 'Jefatura123';

test('Inicio de sesión exitoso', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Usuario').pressSequentially(USER, { delay: 150 });
  await page.getByLabel('Contraseña').pressSequentially(PASS, { delay: 150 });

  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Bandeja Documental' })).toBeVisible();
});