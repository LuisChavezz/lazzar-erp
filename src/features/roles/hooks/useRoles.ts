import { useQuery } from "@tanstack/react-query";
import { getRoles } from "../services/actions";
import { Role } from "../interfaces/role.interface";

export const useRoles = () => {
  return useQuery<Role[]>({
    queryKey: ["roles"],
    queryFn: getRoles,
  });
};
