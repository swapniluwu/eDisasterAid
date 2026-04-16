import API from './axios';
export const logDonation          = (d)   => API.post('/donations', d);
export const getMyDonations       = (p)   => API.get('/donations/my-donations', { params: p });
export const getDonationsByDisaster = (did) => API.get(`/donations/disaster/${did}`);
export const getDonationReceipt   = (id)  => API.get(`/donations/receipt/${id}`);
export const confirmArrival       = (id,d) => API.patch(`/donations/confirm/${id}`, d);