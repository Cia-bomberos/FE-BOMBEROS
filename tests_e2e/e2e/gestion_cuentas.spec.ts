import { test, expect } from '@playwright/test';

test.describe('Módulo de Institución - Gestión de Cuentas de Sección', () => {
  test('CP043: Jefatura cambia contraseña de cuenta de Sanidad', async ({ page }) => {
    const claveA = 'Sanidad123';
    const claveB = 'Sanidad1234';

    const botonLogout = page.locator('header button').filter({
      has: page.locator('svg path[d^="M14 5.5h4.5"]'),
    });

    async function intentarLogin(usuario: string, clave: string): Promise<boolean> {
      await page.goto('/login');
      await page.getByLabel('Usuario').fill(usuario);
      await page.getByLabel('Contraseña').fill(clave);
      await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
      try {
        await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/, { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }

    let claveActual: string;
    let claveNueva: string;

    if (await intentarLogin('sanidad', claveA)) {
      claveActual = claveA;
      claveNueva = claveB;
    } else if (await intentarLogin('sanidad', claveB)) {
      claveActual = claveB;
      claveNueva = claveA;
    } else {
      throw new Error(
        'No se pudo iniciar sesión con la cuenta de Sanidad usando ninguna de las dos claves conocidas (Sanidad123 / Sanidad1234).'
      );
    }

    await botonLogout.click();
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/login');
    await page.getByLabel('Usuario').fill('jefatura');
    await page.getByLabel('Contraseña').fill('Jefatura123');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/);

    await page.getByRole('link', { name: /cuentas de sección/i }).click();
    await expect(page).toHaveURL(/.*\/panel\/cuentas/);

    const tarjetaSanidad = page.locator('section').filter({ hasText: 'JEFE DE SANIDAD' });
    await expect(tarjetaSanidad).toHaveCount(1);

    const botonCambiar = tarjetaSanidad.getByRole('button', { name: /cambiar contraseña/i });
    await expect(botonCambiar).toBeVisible({ timeout: 10000 });
    await botonCambiar.click();

    const inputsPassword = tarjetaSanidad.locator('input[type="password"]');
    await expect(inputsPassword.first()).toBeVisible({ timeout: 5000 });
    await inputsPassword.nth(0).fill(claveNueva);
    await inputsPassword.nth(1).fill(claveNueva);

    await tarjetaSanidad.getByRole('button', { name: /guardar contraseña/i }).click();

    await expect(
      tarjetaSanidad.getByText(/contrase(ñ|n)a actualizada para sanidad/i)
    ).toBeVisible({ timeout: 10000 });

    await botonLogout.click();
    await expect(page).toHaveURL(/.*\/login/);

    await page.getByLabel('Usuario').fill('sanidad');
    await page.getByLabel('Contraseña').fill(claveActual);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page).not.toHaveURL(/.*\/panel\/bandeja-documental/);

    await page.getByLabel('Usuario').fill('sanidad');
    await page.getByLabel('Contraseña').fill(claveNueva);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/);
  });
});
