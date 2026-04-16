import { getPriorityColor, getPriorityLabel } from '../../utils/helpers';
import clsx from 'clsx';

const PriorityBadge = ({ score }) => (
  <div className="flex items-center gap-2">
    <span className={clsx('chip font-bold', getPriorityColor(score))}>
      {score}
    </span>
    <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden min-w-[48px]">
      <div
        className={clsx('h-full rounded-full transition-all duration-500',
          score >= 60 ? 'bg-danger-400' : score >= 35 ? 'bg-warning-400' : 'bg-primary-400'
        )}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);
export default PriorityBadge;