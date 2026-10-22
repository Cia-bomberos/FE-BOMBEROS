import { test, expect } from '@playwright/test';

test('Inicio de sesión exitoso', async ({ page }) => {
  await page.goto('/login');
  
  await page.getByLabel('Usuario').pressSequentially('jefatura', { delay: 150 });
  await page.getByLabel('Contraseña').pressSequentially('Jefatura123', { delay: 150 });
  
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

  await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Bandeja Documental' })).toBeVisible();

  await page.waitForTimeout(4000); 
});
