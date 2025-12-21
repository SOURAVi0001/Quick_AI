import axios from 'axios'

const baseURL = import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_BASE_URL || '';

const api = axios.create({
      baseURL,
      withCredentials: true,
});

export default api;
