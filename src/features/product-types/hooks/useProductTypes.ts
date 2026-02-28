import { useQuery } from "@tanstack/react-query";
import { getProductTypes } from "../services/actions";
import { ProductType } from "../interfaces/product-type.interface";

export const useProductTypes = () => {
  const {
    data: productTypes = [],
    isLoading,
    isError,
    error,
  } = useQuery<ProductType[]>({
    queryKey: ["product-types"],
    queryFn: getProductTypes,
  });

  return {
    productTypes,
    isLoading,
    isError,
    error,
  };
};
