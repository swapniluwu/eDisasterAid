import API from './axios';
export const getAuditLogs  = (p)  => API.get('/audit', { params: p });
export const getAuditLog   = (id) => API.get(`/audit/${id}`);
export const getAuditStats = ()   => API.get('/audit/stats');