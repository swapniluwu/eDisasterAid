import clsx from 'clsx';
import { getStatusColor } from '../../utils/helpers';

const Badge = ({ status, className = '' }) => (
  <span className={clsx(
    'chip font-semibold capitalize',
    getStatusColor(status),
    className
  )}>
    {status}
  </span>
);

export default Badge;