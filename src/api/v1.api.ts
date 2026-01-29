import axios from "axios";


const v1_api = axios.create({
  baseURL: "http://192.168.0.88:8000/api/v1/nucleo",
  headers: {
    "Content-Type": "application/json",
  },
});

export { v1_api };