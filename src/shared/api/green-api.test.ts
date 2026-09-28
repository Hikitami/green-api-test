import { describe, expect, it, vi } from 'vitest';
import { createGreenApi, validateApiUrl } from './green-api';

const credentials = {
  apiUrl: 'https://4100.api.green-api.com',
  idInstance: '4100000001',
  apiTokenInstance: 'test-token',
};
describe('GREEN-API client', () => {
  it.each([
    'https://evil.example',
    'https://api.green-api.com.evil.example',
    'http://4100.api.green-api.com',
    'https://token@api.green-api.com',
    'https://api.green-api.com/path',
  ])('не отправляет токен на %s', (url) => expect(() => validateApiUrl(url)).toThrow());
  it('отправляет текст на канонический chatId', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ idMessage: '42' })));
    await expect(createGreenApi(credentials).sendMessage('1234', 'Привет')).resolves.toEqual({
      idMessage: '42',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://4100.api.green-api.com/waInstance4100000001/sendMessage/test-token',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ chatId: '1234', message: 'Привет' }),
      }),
    );
  });
  it('обрабатывает пустой ответ long polling', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''));
    await expect(
      createGreenApi(credentials).receive(new AbortController().signal),
    ).resolves.toBeNull();
  });
  it('не выводит тело ошибки, которое может содержать секрет', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('secret-token', { status: 401 }));
    await expect(createGreenApi(credentials).getState()).rejects.toThrow('Неверные учётные данные');
  });
  it('проверяет ответ до использования в приложении', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"unexpected": true}'));
    await expect(createGreenApi(credentials).sendMessage('123', 'test')).rejects.toThrow(
      'Неожиданный ответ',
    );
  });
});
