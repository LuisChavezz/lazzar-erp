import axios from "axios";



const facturama_api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FACTURAMA_URL,
  headers: {
    "Content-Type": "application/json",
  },
  auth: {
    username: process.env.NEXT_PUBLIC_FACTURAMA_USER ?? "",
    password: process.env.NEXT_PUBLIC_FACTURAMA_PASSWORD ?? "",
  },
  proxy: false,
});

export { facturama_api };
