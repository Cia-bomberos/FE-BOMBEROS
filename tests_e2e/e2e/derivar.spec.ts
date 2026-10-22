import { test, expect } from '@playwright/test';

test('Derivar Documento', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/login');
  await page.getByLabel('Usuario').fill('administracion');
  await page.getByLabel('Contraseña').fill('Administracion123');
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });

  await page.getByRole('link', { name: 'Registrar ingreso' }).click();
  
  await page.getByLabel('Tipo documental').click();
  await page.getByText('Informe', { exact: true }).click();
  await page.getByLabel('Asunto').fill('Revisión de equipamiento de sanidad');
  await page.getByLabel('Plazo de atención').fill('2026-11-20');
  await page.locator('input[type="file"]').setInputFiles('./tests/test.pdf');
  
  await page.getByRole('button', { name: 'Registrar documento' }).click();

  await expect(page).toHaveURL(/.*\/documentos\/.+/, { timeout: 15000 });
  await expect(page.getByText('Documento registrado')).toBeVisible({ timeout: 10000 });

  await page.getByRole('tab', { name: 'Derivar' }).scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: 'Derivar' }).click();

  const contenedorSeccionDestino = page.locator('div').filter({ hasText: 'Sección destino' }).first();
  await contenedorSeccionDestino.getByRole('combobox').click();
  
  await page.getByRole('option', { name: 'Sanidad' }).click();

  await page.getByPlaceholder('Para atención según su competencia.').pressSequentially('Derivado para evaluación del personal médico.', { delay: 100 });

  await page.waitForTimeout(1000);

  const botonDerivar = page.getByRole('button', { name: 'Derivar', exact: true });
  await botonDerivar.scrollIntoViewIfNeeded();
  await expect(botonDerivar).toBeEnabled({ timeout: 10000 });
  await botonDerivar.click();

  await expect(page.getByRole('heading', { name: /gestionar documento/i })).toBeHidden({ timeout: 15000 });

  await page.waitForTimeout(4000);
});
