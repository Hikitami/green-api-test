import { expect, test, type Page } from '@playwright/test';

async function mockApi(page: Page, options: { unauthorized?: boolean; sendError?: boolean } = {}) {
  const messages: unknown[] = [];
  let sent = 0;
  const calls: { method: string; body: unknown }[] = [];
  await page.route('https://*.api.green-api.com/**', async (route) => {
    const request = route.request();
    const method = new URL(request.url()).pathname.split('/')[2]!;
    const body: unknown = request.postDataJSON();
    calls.push({ method, body });
    if (method === 'getStateInstance')
      return route.fulfill({
        json: { stateInstance: options.unauthorized ? 'notAuthorized' : 'authorized' },
      });
    if (method === 'getSettings')
      return route.fulfill({
        json: { incomingWebhook: 'yes', webhookUrl: '', typeInstance: 'telegram' },
      });
    if (method === 'checkAccount')
      return route.fulfill({ json: { exist: true, chatId: '123456', username: '@alexey' } });
    if (method === 'sendMessage') {
      if (options.sendError) return route.fulfill({ status: 429, json: { error: 'limited' } });
      sent++;
      messages.push({
        receiptId: sent,
        body: {
          typeWebhook: 'incomingMessageReceived',
          idMessage: `reply-${sent}`,
          timestamp: Math.floor(Date.now() / 1000),
          senderData: { chatId: '123456', chatName: 'Алексей' },
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: 'Привет! Сообщение получил.' },
          },
        },
      });
      return route.fulfill({ json: { idMessage: `sent-${sent}` } });
    }
    if (method === 'receiveNotification') {
      if (!messages.length) await new Promise((resolve) => setTimeout(resolve, 350));
      return route.fulfill({ json: messages[0] ?? null });
    }
    if (method === 'deleteNotification') {
      messages.shift();
      return route.fulfill({ json: { result: true } });
    }
    return route.fulfill({ status: 404 });
  });
  return calls;
}

async function connect(page: Page) {
  await page.goto('/');
  await page.getByLabel('Адрес API').fill('https://4100.api.green-api.com');
  await page.getByLabel('ID инстанса').fill('4100000001');
  await page.getByLabel('Токен доступа').fill('test-secret');
  await page.getByRole('button', { name: 'Открыть сообщения' }).click();
}

async function createChat(page: Page) {
  await page.getByRole('button', { name: 'Новый чат', exact: true }).click();
  await page.getByLabel('Номер телефона или @username').fill('+7 (999) 123-45-67');
  await page.getByRole('button', { name: 'Начать диалог' }).click();
  await expect(page.getByLabel('Сообщение', { exact: true })).toBeVisible();
}

test('подключение → номер → отправка → реальный формат ответа → выход', async ({
  page,
}, testInfo) => {
  const calls = await mockApi(page);
  await connect(page);
  await expect(page.getByRole('heading', { name: 'Сообщения', exact: true })).toBeVisible();
  await createChat(page);
  await page.getByLabel('Сообщение', { exact: true }).fill('Привет, Алексей!');
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(page.getByRole('log').getByText('Привет, Алексей!', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('log').getByText('Привет! Сообщение получил.', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => calls.filter((call) => call.method === 'deleteNotification').length)
    .toBe(1);
  expect(calls.find((call) => call.method === 'checkAccount')?.body).toEqual({
    phoneNumber: 79991234567,
  });
  expect(calls.find((call) => call.method === 'sendMessage')?.body).toEqual({
    chatId: '123456',
    message: 'Привет, Алексей!',
  });
  await page.screenshot({
    path: `test-results/conversation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  if (testInfo.project.name === 'mobile') await page.getByLabel('Назад к чатам').click();
  await page.getByLabel('Отключиться', { exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Отключиться', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Подключить аккаунт' })).toBeVisible();
  await expect(page.getByLabel('Токен доступа')).toHaveValue('');
});

test('показывает понятную ошибку неавторизованного инстанса', async ({ page }) => {
  await mockApi(page, { unauthorized: true });
  await connect(page);
  await expect(page.getByRole('alert')).toContainText('Инстанс не авторизован');
});

test('не теряет отклонённое сообщение и не повторяет отправку автоматически', async ({ page }) => {
  const calls = await mockApi(page, { sendError: true });
  await connect(page);
  await createChat(page);
  await page.getByLabel('Сообщение', { exact: true }).fill('Важное сообщение');
  await page.getByLabel('Сообщение', { exact: true }).press('Enter');
  await expect(page.getByRole('log')).toContainText('Слишком много запросов');
  await page.getByRole('button', { name: 'Вернуть текст в поле' }).click();
  await expect(page.getByLabel('Сообщение', { exact: true })).toHaveValue('Важное сообщение');
  await expect(page.getByRole('log').locator('.message-bubble')).toHaveCount(0);
  await expect(page.getByRole('log')).not.toContainText('Слишком много запросов');
  expect(calls.filter((call) => call.method === 'sendMessage')).toHaveLength(1);
});

test('доступный диалог закрывается по Escape и возвращает фокус', async ({ page }) => {
  await mockApi(page);
  await connect(page);
  const trigger = page.getByRole('button', { name: 'Новый чат', exact: true });
  await trigger.click();
  await expect(page.getByLabel('Номер телефона или @username')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('пустые сообщения запрещены, Shift+Enter добавляет строку, токен не сохраняется', async ({
  page,
}) => {
  await mockApi(page);
  await connect(page);
  await createChat(page);
  const input = page.getByLabel('Сообщение', { exact: true });
  await input.fill('   ');
  await expect(page.getByLabel('Отправить сообщение')).toBeDisabled();
  await input.fill('Первая строка');
  await input.press('Shift+Enter');
  await expect(input).toHaveValue('Первая строка\n');
  await input.fill('а'.repeat(4097));
  await expect(page.getByLabel('Отправить сообщение')).toBeDisabled();
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('test-secret');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Подключить аккаунт' })).toBeVisible();
});

test('поле растёт по тексту, прокручивается только на максимуме и сжимается после отправки', async ({
  page,
}) => {
  await mockApi(page);
  await connect(page);
  await createChat(page);
  const input = page.getByLabel('Сообщение', { exact: true });
  await expect(input).toHaveCSS('overflow-y', 'hidden');
  await expect(input).toHaveCSS('resize', 'none');
  const initialHeight = await input.evaluate((element) => element.getBoundingClientRect().height);
  await input.fill('Первая строка\nВторая строка\nТретья строка');
  await expect
    .poll(() => input.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(initialHeight);
  await expect(input).toHaveCSS('overflow-y', 'hidden');
  await input.fill(Array.from({ length: 20 }, (_, index) => `Строка ${index + 1}`).join('\n'));
  await expect(input).toHaveCSS('height', '160px');
  await expect(input).toHaveCSS('overflow-y', 'auto');
  expect(await input.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await page.getByRole('button', { name: 'Отправить сообщение' }).click();
  await expect(input).toHaveValue('');
  await expect(input).toHaveCSS('overflow-y', 'hidden');
  await expect
    .poll(() => input.evaluate((element) => element.getBoundingClientRect().height))
    .toBe(initialHeight);
});
