import { motion } from 'framer-motion';
import clsx from 'clsx';

const StatCard = ({ label, value, sub, subColor = 'neutral', icon: Icon, color = 'primary', delay = 0 }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', icon: 'text-primary-400' },
    danger:  { bg: 'bg-danger-50',  text: 'text-danger-600',  icon: 'text-danger-400'  },
    success: { bg: 'bg-success-50', text: 'text-success-600', icon: 'text-success-400' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600', icon: 'text-warning-400' },
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-600',    icon: 'text-teal-400'    },
  };
  const subColorMap = {
    up:      'text-success-600',
    down:    'text-danger-600',
    warn:    'text-warning-600',
    info:    'text-primary-600',
    neutral: 'text-neutral-400',
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="card card-hover p-5 flex items-start gap-4"
    >
      {Icon && (
        <div className={clsx('p-2.5 rounded-xl', c.bg)}>
          <Icon className={clsx('h-5 w-5', c.icon)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
        <p className={clsx('text-2xl font-display font-bold', c.text)}>{value}</p>
        {sub && <p className={clsx('text-xs mt-1 font-medium', subColorMap[subColor])}>{sub}</p>}
      </div>
    </motion.div>
  );
};
export default StatCard;