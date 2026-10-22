import { test, expect } from '@playwright/test';

test('Rechazo de archivo que no es un PDF válido', async ({ page }) => {
  test.setTimeout(60000);

  // Usando baseURL configurado
  await page.goto('/login');
  await page.getByLabel('USUARIO').fill('maquinas');
  await page.getByLabel('CONTRASEÑA').fill('Maquinas123');
  await page.getByRole('button', { name: /INGRESAR AL SISTEMA/i }).click();

  await page.getByRole('link', { name: /REGISTRAR INGRESO/i }).click();
  
  // Clic en el combobox personalizado de Tipo Documental
  await page.locator('#tipo').click();
  await page.getByRole('option', { name: 'Oficio' }).click();

  await page.getByPlaceholder('Descripción breve del contenido').fill('Prueba archivo falso');
  await page.getByLabel('PLAZO DE ATENCIÓN').fill('2026-11-20');

  // Subir archivo falso
  await page.locator('input[type="file"]').setInputFiles({
    name: 'archivo_falso.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('Texto plano falso sin estructura PDF')
  });

  await page.getByRole('button', { name: /REGISTRAR DOCUMENTO/i }).click();

  // Validar alerta roja exacta
  await expect(page.getByText('El archivo no es un PDF válido.')).toBeVisible();
});
