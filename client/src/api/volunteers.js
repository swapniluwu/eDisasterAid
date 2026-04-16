import API from './axios';
export const getVolunteers        = (p)    => API.get('/volunteers', { params: p });
export const getVolunteer         = (id)   => API.get(`/volunteers/${id}`);
export const assignZone           = (id,d) => API.patch(`/volunteers/${id}/zone`, d);
export const updateSkills         = (id,d) => API.patch(`/volunteers/${id}/skills`, d);
export const getAvailableVols     = (did)  => API.get(`/volunteers/available/${did}`);
export const getMyVolDashboard    = ()     => API.get('/volunteers/my-dashboard');