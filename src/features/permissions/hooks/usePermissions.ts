import { useQuery } from "@tanstack/react-query";
import { Permission } from "../interfaces/permission.interface";
import { getPermissions } from "../services/actions";

export const usePermissions = () => {
  return useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: getPermissions,
  });
};
