import axios from "axios";
import { removeApiVersion } from "../utils/removeApiVersion";

const api = axios.create({
  baseURL: removeApiVersion(process.env.NEXT_PUBLIC_API_URL || ""),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  proxy: false,
});

export { api };
