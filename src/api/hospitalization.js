import axios from './axios';

export const getStatus = () => {
    return axios.get('/hospitalization/status');
};
