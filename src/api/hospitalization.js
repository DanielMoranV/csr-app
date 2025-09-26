import axios from './axios';

export const hospitalization = {
    getStatus: () => axios.get('/hospitalization/status'),
    getRooms: (params) => axios.get('/hospitalization/rooms', { params }),
    getBeds: (params) => axios.get('/hospitalization/beds', { params })
};
