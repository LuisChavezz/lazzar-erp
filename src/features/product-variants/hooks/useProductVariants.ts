import { useQuery } from "@tanstack/react-query";
import { getProductVariants } from "../services/actions";
import { ProductVariant } from "../interfaces/product-variant.interface";

export const useProductVariants = (con_bom?: boolean) => {
  const {
    data: productVariants = [],
    isLoading,
    isError,
    error,
  } = useQuery<ProductVariant[]>({
    queryKey: ["product-variants", con_bom],
    queryFn: () => getProductVariants(con_bom),
  });

  return {
    productVariants,
    isLoading,
    isError,
    error,
  };
};
