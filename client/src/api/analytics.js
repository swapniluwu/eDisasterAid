import API from './axios';
export const getDashboard         = (did) => API.get(`/analytics/dashboard/${did}`);
export const getPlatformOverview  = ()    => API.get('/analytics/overview');
export const getClosureReport     = (did) => API.get(`/analytics/report/${did}`);
export const getNotifications     = (p)   => API.get('/analytics/notifications', { params: p });
export const markNotificationsRead = ()   => API.patch('/analytics/notifications/read');