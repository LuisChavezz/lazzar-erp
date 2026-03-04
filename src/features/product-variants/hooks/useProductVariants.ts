import { useQuery } from "@tanstack/react-query";
import { getProductVariants } from "../services/actions";
import { ProductVariant } from "../interfaces/product-variant.interface";

export const useProductVariants = () => {
  const {
    data: productVariants = [],
    isLoading,
    isError,
    error,
  } = useQuery<ProductVariant[]>({
    queryKey: ["product-variants"],
    queryFn: getProductVariants,
  });

  return {
    productVariants,
    isLoading,
    isError,
    error,
  };
};
