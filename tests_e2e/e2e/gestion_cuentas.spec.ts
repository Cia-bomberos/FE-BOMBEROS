import { test, expect } from '@playwright/test';

test.describe('Módulo de Institución - Gestión de Cuentas de Sección', () => {
  test('CP043: Jefatura deja la cuenta de Sanidad como sanidad / Sanidad123', async ({ page }) => {
    test.setTimeout(180000);

    const usernameFinal = 'sanidad';
    const passwordFinal = 'Sanidad123';
    const usernameTemporal = `sanidad_tmp_${Date.now()}`;

    const login = async (usuario: string, clave: string) => {
      await page.goto('/login');
      await page.getByLabel('Usuario').fill(usuario);
      await page.getByLabel('Contraseña').fill(clave);
      await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
      await expect(page).toHaveURL(/.*\/panel/, { timeout: 20000 });
    };

    const logout = async () => {
      const botonLogout = page.getByRole('button', { name: /cerrar sesión/i });
      await expect(botonLogout).toBeVisible({ timeout: 10000 });
      await botonLogout.click();
      await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
    };

    const irACuentas = async () => {
      await page.goto('/panel/cuentas');
      await expect(page).toHaveURL(/.*\/panel\/cuentas/);
      await expect(page.getByRole('heading', { name: 'Cuentas de sección' })).toBeVisible();
    };

    const cambiarCuenta = async (tarjeta: any, nuevoUsername: string, nuevaPassword: string) => {
      await tarjeta.getByRole('button', { name: /editar cuenta/i }).click();

      const inputUsername = tarjeta.getByLabel(/nuevo nombre de usuario/i);
      const inputPassword = tarjeta.getByLabel(/nueva contraseña/i);
      await expect(inputUsername).toBeVisible();
      await expect(inputPassword).toBeVisible();

      await inputUsername.fill(nuevoUsername);
      await inputPassword.fill(nuevaPassword);

      await tarjeta.getByRole('button', { name: /guardar cambios/i }).click();

      // Esperar un momento a que la acción termine (la UI se actualiza sola)
      await page.waitForTimeout(2000);
    };

    // --- 1. Login Jefatura ---
    await login('jefatura', 'Jefatura123');
    await irACuentas();

    // --- 2. Cambiar Sanidad → sanidad_tmp_... ---
    const tarjetaSanidad = page.locator('section').filter({ hasText: 'JEFE DE SANIDAD' });
    await expect(tarjetaSanidad).toHaveCount(1);
    await cambiarCuenta(tarjetaSanidad, usernameTemporal, passwordFinal);

    // --- 3. Recargar para ver el nuevo username ---
    await page.reload();
    await expect(page).toHaveURL(/.*\/panel\/cuentas/);

    // --- 4. Logout Jefatura ---
    await logout();

    // --- 5. Login Sanidad con sanidad_tmp_... ---
    await login(usernameTemporal, passwordFinal);

    // --- 6. Logout Sanidad ---
    await logout();

    // --- 7. Login Jefatura ---
    await login('jefatura', 'Jefatura123');
    await irACuentas();

    // --- 8. Restaurar Sanidad → sanidad / Sanidad123 ---
    const tarjetaTemporal = page.locator('section').filter({ hasText: usernameTemporal.toUpperCase() });
    await expect(tarjetaTemporal).toHaveCount(1);
    await cambiarCuenta(tarjetaTemporal, usernameFinal, passwordFinal);

    // --- 9. Recargar para ver el username restaurado ---
    await page.reload();
    await expect(page).toHaveURL(/.*\/panel\/cuentas/);

    // --- 10. Logout Jefatura ---
    await logout();

    // --- 11. Login Sanidad con credenciales restablecidas ---
    await login(usernameFinal, passwordFinal);
  });
});