import axios from 'axios';
import { toast } from 'svelte-sonner';

const api = axios.create();

api.interceptors.response.use(
  (response) => response,
  (error) => {

    const message = error.response?.data?.message || 'Unknown error.';

    toast.error('An error occurred', {
      description: message
    });
    return Promise.reject(error);
  }
);

export default api;
