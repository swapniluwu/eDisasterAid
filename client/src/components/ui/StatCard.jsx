import { motion } from 'framer-motion';
import clsx from 'clsx';

const StatCard = ({ label, value, sub, subColor = 'neutral', icon: Icon, color = 'primary', delay = 0 }) => {
  const colorMap = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-600', icon: 'text-primary-500' },
    danger:  { bg: 'bg-danger-50',  text: 'text-danger-600',  icon: 'text-danger-500'  },
    success: { bg: 'bg-success-50', text: 'text-success-600', icon: 'text-success-500' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-600', icon: 'text-warning-500' },
    teal:    { bg: 'bg-teal-50',    text: 'text-teal-600',    icon: 'text-teal-500'    },
  };
  const subColorMap = {
    up: 'text-success-600', down: 'text-danger-600',
    warn: 'text-warning-600', info: 'text-primary-600', neutral: 'text-neutral-400',
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="card p-3 sm:p-4 flex items-start gap-3"
    >
      {Icon && (
        <div className={clsx('p-2 rounded-xl flex-shrink-0', c.bg)}>
          <Icon className={clsx('h-4 w-4 sm:h-5 sm:w-5', c.icon)} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5 truncate">
          {label}
        </p>
        <p className={clsx('text-xl sm:text-2xl font-display font-bold leading-none', c.text)}>
          {value}
        </p>
        {sub && (
          <p className={clsx('text-[10px] sm:text-xs mt-1 font-medium truncate', subColorMap[subColor])}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;