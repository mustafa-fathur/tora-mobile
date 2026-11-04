// "Rp 1.250.000" that can run on Reanimated's UI thread (a "worklet"), for the
// count-up animation. Same output as formatMoney(n) for IDR (tests compare them),
// without Intl, which worklets can't use.
export function formatIdrLive(amount: number, signed = false) {
  'worklet';
  const n = Math.round(amount);
  const digits = String(Math.abs(n));
  let grouped = '';
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) grouped += '.';
    grouped += digits[i];
  }
  const sign = n < 0 ? '-' : signed && n > 0 ? '+' : '';
  return `${sign}Rp ${grouped}`;
}
