import { test, expect } from '@playwright/test';

const USER = process.env.E2E_USER ?? 'administracion';
const PASS = process.env.E2E_PASS ?? 'Administracion123';

test('Registrar Envío Externo', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Usuario').fill(USER);
  await page.getByLabel('Contraseña').fill(PASS);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });

  await page.getByRole('link', { name: 'Registrar ingreso' }).click();

  await page.getByLabel('Tipo documental').click();
  await page.getByRole('option', { name: 'Carta', exact: true }).click();
  await page.getByLabel('Asunto').fill('Expediente para remisión externa');
  await page.getByLabel('Plazo de atención').fill('2026-11-25');
  await page.locator('input[type="file"]').setInputFiles('../test.pdf');

  await page.getByRole('button', { name: 'Registrar documento' }).click();

  await expect(page).toHaveURL(/.*\/documentos\/[^/]+$/, { timeout: 15000 });
  await expect(page.getByText('Documento registrado')).toBeVisible({ timeout: 10000 });

  await page.getByRole('link', { name: /descargar/i }).click();

  await page.getByRole('tab', { name: 'Envío externo' }).click();

  await page
    .getByPlaceholder('CGBVP · IV Comandancia')
    .fill('Ministerio del Interior');

  const botonEnvio = page.getByRole('button', { name: 'Registrar envío' });
  await botonEnvio.scrollIntoViewIfNeeded();
  await expect(botonEnvio).toBeEnabled({ timeout: 10000 });
  await botonEnvio.click();

  await expect(page.getByText(/Envio externo registrado/i).first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Ministerio del Interior/i).first()).toBeVisible();
});