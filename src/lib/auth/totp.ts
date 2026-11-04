// Ported from tora web: src/app/(app)/settings/security-actions.ts @ dea6031
// (the naming and code checks of startTotpEnrollment / confirmTotpEnrollment).

/** "Authenticator", or "Authenticator 2", 3, … if that name is taken. */
export function nextAuthenticatorName(taken: (string | null | undefined)[]) {
  const used = new Set(taken);
  let name = 'Authenticator';
  for (let i = 2; used.has(name); i++) name = `Authenticator ${i}`;
  return name;
}

/** The 6-digit code without spaces, or an error message. */
export function checkCode(raw: string): { ok: true; code: string } | { ok: false; message: string } {
  const code = raw.replace(/\s/g, '');
  return /^\d{6}$/.test(code) ? { ok: true, code } : { ok: false, message: 'Enter the 6-digit code shown in your authenticator app.' };
}

/** The setup key in groups of four, easier to type: "JBSW Y3DP EHPK 3PXP". */
export const groupSecret = (secret: string) => secret.replace(/(.{4})/g, '$1 ').trim();
