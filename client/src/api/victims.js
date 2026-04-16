import API from './axios';
export const registerVictim   = (d)  => API.post('/victims/register', d);
export const getVictims       = (p)  => API.get('/victims', { params: p });
export const getMyRegistrations = () => API.get('/victims/my-registrations');
export const getVictim        = (id) => API.get(`/victims/${id}`);
export const getPriorityQueue = (did) => API.get(`/victims/priority/${did}`);
export const verifyVictim     = (id,d) => API.patch(`/victims/${id}/verify`, d);
export const rescoreVictim    = (id,d) => API.patch(`/victims/${id}/rescore`, d);