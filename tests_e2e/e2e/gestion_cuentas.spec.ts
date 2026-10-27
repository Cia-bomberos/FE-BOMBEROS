import { test, expect } from '@playwright/test';

test.describe('Módulo de Institución - Gestión de Cuentas de Sección', () => {
  test('CP043: Jefatura deja la cuenta de Sanidad como sanidad / Sanidad123', async ({ page }) => {
    test.setTimeout(90000);

    const usernameFinal = 'sanidad';
    const passwordFinal = 'Sanidad123';
    const usernameTemporal = `sanidad_tmp_${Date.now()}`;

    const botonLogout = page.locator('header button').filter({
      has: page.locator('svg path[d^="M14 5.5h4.5"]'),
    });

    // 1. Login como Jefatura
    await page.goto('/login');
    await page.getByLabel('Usuario').fill('jefatura');
    await page.getByLabel('Contraseña').fill('Jefatura123');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/);

    // 2. Ir a Cuentas
    await page.getByRole('link', { name: /cuentas de sección/i }).click();
    await expect(page).toHaveURL(/.*\/panel\/cuentas/);

    const tarjetaSanidad = page.locator('section').filter({ hasText: 'JEFE DE SANIDAD' });
    await expect(tarjetaSanidad).toHaveCount(1);

    // Función auxiliar para cambiar username + password
    const cambiarCuenta = async (tarjeta: any, nuevoUsername: string, nuevaPassword: string) => {
      await tarjeta.getByRole('button', { name: /editar cuenta/i }).click();

      const inputUsername = tarjeta.getByLabel(/nuevo nombre de usuario/i);
      const inputPassword = tarjeta.getByLabel(/nueva contraseña/i);
      await expect(inputUsername).toBeVisible();
      await expect(inputPassword).toBeVisible();

      await inputUsername.fill(nuevoUsername);
      await inputPassword.fill(nuevaPassword);

      await tarjeta.getByRole('button', { name: /guardar cambios/i }).click();

      // Esperar a que el formulario se cierre (vuelve el botón "Editar cuenta…")
      await expect(
        tarjeta.getByRole('button', { name: /editar cuenta/i })
      ).toBeVisible({ timeout: 15000 });
    };

    // 3. Cambiar a username temporal
    await cambiarCuenta(tarjetaSanidad, usernameTemporal, passwordFinal);

    // 4. Recargar la página
    await page.reload();
    await expect(page).toHaveURL(/.*\/panel\/cuentas/);

    const tarjetaTemporal = page.locator('section').filter({ hasText: usernameTemporal.toUpperCase() });
    await expect(tarjetaTemporal).toHaveCount(1);

    // 5. Cambiar de vuelta a "sanidad"
    await cambiarCuenta(tarjetaTemporal, usernameFinal, passwordFinal);

    // 6. Logout
    await botonLogout.click();
    await expect(page).toHaveURL(/.*\/login/);

    // 7. Verificar que sanidad / Sanidad123 inicia sesión
    await page.getByLabel('Usuario').fill(usernameFinal);
    await page.getByLabel('Contraseña').fill(passwordFinal);
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page).toHaveURL(/.*\/panel\/bandeja-documental/);
  });
});