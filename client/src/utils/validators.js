export const emailRegex =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const passwordRules = {
  length: /.{6,}/,
  upper: /[A-Z]/,
  lower: /[a-z]/,
  number: /\d/,
  special: /[@#$%!]/,
};

export function passwordStrength(pwd) {
  let score = 0;
  Object.values(passwordRules).forEach(r => {
    if (r.test(pwd)) score++;
  });

  if (score <= 2) return "Weak";
  if (score === 3 || score === 4) return "Medium";
  return "Strong";
}
