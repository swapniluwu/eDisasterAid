import API from './axios';
export const registerUser  = (data) => API.post('/auth/register', data);
export const loginUser     = (data) => API.post('/auth/login', data);
export const getMe         = ()     => API.get('/auth/me');
export const getAllUsers    = (p)    => API.get('/auth/users', { params: p });
export const toggleUser    = (id)   => API.patch(`/auth/users/${id}/toggle`);