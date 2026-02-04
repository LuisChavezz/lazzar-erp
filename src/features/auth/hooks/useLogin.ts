import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export const useLogin = () => {
  const router = useRouter();
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Manejar cambios en los campos de entrada
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Intentar iniciar sesión con las credenciales
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      // ! Verificar si hubo un error en la autenticación
      if (result?.error) {
        toast.error("Credenciales inválidas");
        setLoading(false);

      } else { // Si la autenticación fue exitosa
        await update(); // Actualizar la sesión con los nuevos datos
        router.refresh(); // Refrescar la sesión para reflejar los cambios
        router.push("/select-branch"); // Redirigir al usuario a la página de selección de sucursal
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Error de conexión");
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    handleChange,
    handleSubmit,
  };
};
