import API from './axios';
export const getDisasters      = (p)  => API.get('/disasters', { params: p });
export const getDisaster       = (id) => API.get(`/disasters/${id}`);
export const createDisaster    = (d)  => API.post('/disasters', d);
export const updateDisaster    = (id,d) => API.patch(`/disasters/${id}`, d);
export const updateDisasterStatus = (id,d) => API.patch(`/disasters/${id}/status`, d);
export const getDisasterSummary = (id) => API.get(`/disasters/${id}/summary`);