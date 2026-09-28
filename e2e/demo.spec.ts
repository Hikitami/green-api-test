import { expect, test } from '@playwright/test';

test('демо работает без учётных данных и без запросов к GREEN-API', async ({ page }) => {
  const requests: string[] = [];
  await page.route('https://*.green-api.com/**', (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо без аккаунта' }).click();
  await expect(page.getByRole('region', { name: 'Управление деморежимом' })).toBeVisible();
  await expect(page.getByRole('log')).toContainText('Здорово! Напиши мне что-нибудь');
  await page.getByLabel('Сообщение', { exact: true }).fill('Тест без персональных данных');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByRole('log')).toContainText('Сообщение получил! Всё отображается', {
    timeout: 10_000,
  });
  await expect(page.getByLabel('Прочитано', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Входящее сообщение', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('Это новое входящее сообщение');
  await page.getByRole('button', { name: 'Ошибка следующей отправки', exact: true }).click();
  await page.getByLabel('Сообщение', { exact: true }).fill('Проверка ошибки');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByRole('log')).toContainText('Тестовая ошибка');
  await page.getByRole('button', { name: 'Выйти из демо', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Открыть демо без аккаунта' })).toBeVisible();
  expect(requests).toEqual([]);
});

test('после выхода из демо можно подключить обычный клиент', async ({ page }) => {
  let stateRequests = 0;
  await page.route('https://*.green-api.com/**', async (route) => {
    const method = new URL(route.request().url()).pathname.split('/')[2];
    if (method === 'getStateInstance') {
      stateRequests++;
      return route.fulfill({ json: { stateInstance: 'authorized' } });
    }
    if (method === 'getSettings')
      return route.fulfill({
        json: { incomingWebhook: 'yes', webhookUrl: '', typeInstance: 'telegram' },
      });
    if (method === 'receiveNotification') return route.fulfill({ json: null });
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо без аккаунта' }).click();
  await expect(page.getByRole('region', { name: 'Управление деморежимом' })).toBeVisible();
  await page.getByRole('button', { name: 'Выйти из демо', exact: true }).click();
  expect(stateRequests).toBe(0);
  await page.getByLabel('Адрес API').fill('https://4100.api.green-api.com');
  await page.getByLabel('ID инстанса').fill('4100000001');
  await page.getByLabel('Токен доступа').fill('test-secret');
  await page.getByRole('button', { name: 'Открыть сообщения' }).click();
  await expect(page.getByRole('heading', { name: 'Сообщения', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Управление деморежимом' })).toHaveCount(0);
  await expect(page.getByText('Ваши чаты будут здесь')).toBeVisible();
  expect(stateRequests).toBe(1);
});

test('повтор переносит сообщение вниз, обновляет время и сохраняет черновик', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Открыть демо без аккаунта' }).click();
  await expect(page.getByRole('log')).toContainText('Здорово! Напиши мне что-нибудь');
  await page.getByRole('button', { name: 'Ошибка следующей отправки', exact: true }).click();
  const input = page.getByLabel('Сообщение', { exact: true });
  await input.fill('Повторяем именно это сообщение');
  await page.getByRole('button', { name: 'Отправить сообщение', exact: true }).click();
  const bubble = page
    .getByRole('log')
    .locator('.message-bubble')
    .filter({ hasText: 'Повторяем именно это сообщение' });
  await expect(bubble).toContainText('Тестовая ошибка');
  const oldTime = await bubble.locator('time').getAttribute('datetime');
  await page.getByRole('button', { name: 'Входящее сообщение', exact: true }).click();
  await expect(page.getByRole('log').locator('.message-bubble').last()).toContainText(
    'Это новое входящее сообщение',
  );
  await input.fill('Другой незавершённый текст');
  await bubble.getByRole('button', { name: 'Отправить повторно', exact: true }).click();
  await expect(bubble.getByLabel('Отправляется', { exact: true })).toBeVisible();
  await expect(page.getByRole('log').locator('.message-bubble').last()).toContainText(
    'Повторяем именно это сообщение',
  );
  expect(Date.parse((await bubble.locator('time').getAttribute('datetime'))!)).toBeGreaterThan(
    Date.parse(oldTime!),
  );
  await expect(bubble.getByLabel('Прочитано', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(bubble).toHaveCount(1);
  await expect(bubble).not.toContainText('Тестовая ошибка');
  await expect(input).toHaveValue('Другой незавершённый текст');
});
