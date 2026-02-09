import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../services/actions";
import { User } from "../interfaces/user.interface";

export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsers,
  });
};
