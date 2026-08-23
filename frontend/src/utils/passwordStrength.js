/**
 * Pure client-side password strength calculator.
 * Does NOT affect backend validation — purely visual feedback.
 * Returns { score: 0-4, label, color, width }
 */
export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200', width: '0%' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Cap at 4
  score = Math.min(score, 4);

  const levels = [
    { label: '',        color: 'bg-gray-200',  width: '0%'   },
    { label: 'Weak',    color: 'bg-red-500',    width: '25%'  },
    { label: 'Fair',    color: 'bg-orange-400', width: '50%'  },
    { label: 'Good',    color: 'bg-yellow-400', width: '75%'  },
    { label: 'Strong',  color: 'bg-green-500',  width: '100%' },
  ];

  return { score, ...levels[score] };
}
