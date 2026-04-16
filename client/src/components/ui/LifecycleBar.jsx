import clsx from 'clsx';

const STAGES = ['Submitted','Verified','Approved','Assigned','Dispatched','Delivered','Closed'];

const LifecycleBar = ({ currentStatus }) => {
  const currentIdx = STAGES.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-0 w-full overflow-hidden rounded-xl border border-neutral-100">
      {STAGES.map((stage, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div
            key={stage}
            className={clsx(
              'flex-1 py-1.5 text-center text-[10px] font-semibold transition-colors duration-300',
              done   && 'bg-success-50 text-success-600',
              active && 'bg-primary-600 text-white',
              !done && !active && 'bg-neutral-50 text-neutral-300'
            )}
          >
            {stage}
          </div>
        );
      })}
    </div>
  );
};
export default LifecycleBar;