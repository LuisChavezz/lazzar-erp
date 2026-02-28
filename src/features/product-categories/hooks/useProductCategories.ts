import { useQuery } from "@tanstack/react-query";
import { getProductCategories } from "../services/actions";
import { ProductCategory } from "../interfaces/product-category.interface";

export const useProductCategories = () => {
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery<ProductCategory[]>({
    queryKey: ["product-categories"],
    queryFn: getProductCategories,
  });

  return {
    categories,
    isLoading,
    isError,
    error,
  };
};
