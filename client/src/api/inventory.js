import API from './axios';
export const addInventory     = (d)  => API.post('/inventory', d);
export const getInventory     = (did,p) => API.get(`/inventory/${did}`, { params: p });
export const getInventoryItem = (id) => API.get(`/inventory/item/${id}`);
export const updateInventory  = (id,d) => API.patch(`/inventory/item/${id}`, d);
export const restockItem      = (id,d) => API.patch(`/inventory/item/${id}/restock`, d);
export const deleteInventory  = (id) => API.delete(`/inventory/item/${id}`);
export const getStockAlerts   = (did) => API.get(`/inventory/alerts/${did}`);