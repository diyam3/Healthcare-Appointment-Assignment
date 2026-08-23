import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

const CONFIG = {
  High:   { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    Icon: AlertTriangle, label: 'High Urgency'   },
  Medium: { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  Icon: AlertCircle,   label: 'Medium Urgency' },
  Low:    { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  Icon: CheckCircle,   label: 'Low Urgency'    },
};

export default function UrgencyBadge({ level, size = 'sm' }) {
  const cfg = CONFIG[level] || CONFIG.Low;
  const { bg, text, border, Icon, label } = cfg;
  const iconSize = size === 'lg' ? 16 : 13;
  const px = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold ${bg} ${text} ${border} ${px}`}>
      <Icon size={iconSize} />
      {label}
    </span>
  );
}
