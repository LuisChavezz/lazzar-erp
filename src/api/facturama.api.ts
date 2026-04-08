import "server-only";
import axios from "axios";

const getFacturamaConfig = () => {
  const baseURL = process.env.FACTURAMA_URL;
  const username = process.env.FACTURAMA_USER;
  const password = process.env.FACTURAMA_PASSWORD;

  if (!baseURL || !username || !password) {
    throw new Error("Missing Facturama environment variables.");
  }

  return {
    baseURL,
    username,
    password,
  };
};

const facturama_api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
  proxy: false,
});

facturama_api.interceptors.request.use((config) => {
  const { baseURL, username, password } = getFacturamaConfig();

  return {
    ...config,
    baseURL: config.baseURL ?? baseURL,
    auth: config.auth ?? {
      username,
      password,
    },
  };
});

export { facturama_api };
