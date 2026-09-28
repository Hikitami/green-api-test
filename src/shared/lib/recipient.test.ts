import { describe, expect, it } from 'vitest';
import { parseRecipient } from './recipient';

describe('parseRecipient', () => {
  it.each(['+7 (999) 123-45-67', '8 999 123 45 67', '79991234567'])('нормализует %s', (input) => {
    expect(parseRecipient(input)).toEqual({ phoneNumber: 79991234567 });
  });
  it('поддерживает международный номер и username', () => {
    expect(parseRecipient('+375 29 1234567')).toEqual({ phoneNumber: 375291234567 });
    expect(parseRecipient('@alex_test')).toEqual({ username: '@alex_test' });
  });
  it.each([
    '',
    '123',
    'abc79991234567',
    '++79991234567',
    '0001234567',
    '9999999999999999',
    '@a!ex',
  ])('отклоняет %s', (input) => expect(parseRecipient(input)).toBeNull());
});
