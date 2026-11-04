import { describe, expect, it } from 'vitest';

import { checkCode, groupSecret, nextAuthenticatorName } from '@/lib/auth/totp';

describe('totp helpers', () => {
  it('picks an unused authenticator name, like the web', () => {
    expect(nextAuthenticatorName([])).toBe('Authenticator');
    expect(nextAuthenticatorName(['Authenticator', 'Authenticator 2'])).toBe('Authenticator 3');
  });
  it('accepts 6-digit codes with spaces', () => {
    expect(checkCode('123 456')).toEqual({ ok: true, code: '123456' });
    expect(checkCode('12345')).toEqual({ ok: false, message: 'Enter the 6-digit code shown in your authenticator app.' });
  });
  it('groups the setup key', () => {
    expect(groupSecret('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP');
  });
});
