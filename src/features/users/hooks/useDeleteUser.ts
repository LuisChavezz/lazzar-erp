import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "../services/actions";
import toast from "react-hot-toast";


export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuario eliminado correctamente');
    },
    onError: (error) => {
      console.error(error);
      toast.error('Error al eliminar el usuario');
    }
  })
};