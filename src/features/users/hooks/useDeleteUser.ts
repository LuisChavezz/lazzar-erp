import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "../services/actions";
import toast from "react-hot-toast";
import { User } from "../interfaces/user.interface";


export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] });
      const previousUsers = queryClient.getQueryData<User[]>(['users']);

      // Remove the user from the cache
      if (previousUsers) {
        queryClient.setQueryData<User[]>(['users'], (old) =>
          old ? old.filter((user) => user.id !== id) : []
        );
      }

      return { previousUsers };
    },
    onError: (err, id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData<User[]>(['users'], context.previousUsers);
      }
      console.error(err);
      toast.error('Error al eliminar el usuario');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onSuccess: () => {
      toast.success('Usuario eliminado correctamente');
    },
  })
};