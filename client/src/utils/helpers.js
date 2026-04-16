// Format date to readable string
export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

// Priority score color coding
export const getPriorityColor = (score) => {
  if (score >= 60) return 'text-danger-600 bg-danger-50';
  if (score >= 35) return 'text-warning-600 bg-warning-50';
  return 'text-primary-600 bg-primary-50';
};

export const getPriorityLabel = (score) => {
  if (score >= 60) return 'Critical';
  if (score >= 35) return 'High';
  if (score >= 20) return 'Medium';
  return 'Low';
};

// Disaster severity color
export const getSeverityColor = (severity) => {
  const map = {
    critical: 'text-danger-600 bg-danger-50 border-danger-100',
    high:     'text-warning-600 bg-warning-50 border-warning-100',
    medium:   'text-primary-600 bg-primary-50 border-primary-100',
    low:      'text-success-600 bg-success-50 border-success-100',
  };
  return map[severity] || 'text-neutral-600 bg-neutral-50';
};

// Distribution status color
export const getStatusColor = (status) => {
  const map = {
    Submitted:  'text-neutral-600 bg-neutral-50',
    Verified:   'text-primary-600 bg-primary-50',
    Approved:   'text-teal-600 bg-teal-50',
    Assigned:   'text-warning-600 bg-warning-50',
    Dispatched: 'text-primary-600 bg-primary-100',
    Delivered:  'text-success-600 bg-success-50',
    Closed:     'text-neutral-400 bg-neutral-50',
    // Victim statuses
    pending:    'text-warning-600 bg-warning-50',
    verified:   'text-success-600 bg-success-50',
    rejected:   'text-danger-600 bg-danger-50',
    // Disaster statuses
    active:     'text-success-600 bg-success-50',
    inactive:   'text-warning-600 bg-warning-50',
    closed:     'text-neutral-400 bg-neutral-50',
  };
  return map[status] || 'text-neutral-600 bg-neutral-50';
};

// Truncate text
export const truncate = (str, n = 40) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

// Calculate priority score preview (matches backend formula)
export const calcPreviewScore = ({ severity, familySize, hasElderly, hasChildren }) => {
  let score = (severity || 0) * 4 + (familySize || 0) * 2;
  if (hasElderly) score += 3;
  if (hasChildren) score += 2;
  return Math.min(score, 100);
};