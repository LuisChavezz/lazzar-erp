import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { ProductVariant } from "../interfaces/product-variant.interface";

interface ProductVariantState {
  productVariants: ProductVariant[];
  selectedProductVariant: ProductVariant | null;
  isLoading: boolean;

  setProductVariants: (productVariants: ProductVariant[]) => void;
  setSelectedProductVariant: (productVariant: ProductVariant | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addProductVariant: (productVariant: ProductVariant) => void;
  updateProductVariant: (productVariant: ProductVariant) => void;
  deleteProductVariant: (productVariantId: number) => void;
}

export const useProductVariantStore = create<ProductVariantState>()(
  devtools(
    persist(
      (set) => ({
        productVariants: [],
        selectedProductVariant: null,
        isLoading: false,

        setProductVariants: (productVariants) => set({ productVariants }),
        setSelectedProductVariant: (selectedProductVariant) => set({ selectedProductVariant }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addProductVariant: (productVariant) =>
          set((state) => ({ productVariants: [...state.productVariants, productVariant] })),
        updateProductVariant: (productVariant) =>
          set((state) => ({
            productVariants: state.productVariants.map((variant) =>
              variant.id === productVariant.id ? { ...variant, ...productVariant } : variant
            ),
          })),
        deleteProductVariant: (id) =>
          set((state) => ({
            productVariants: state.productVariants.filter((variant) => variant.id !== id),
          })),
      }),
      {
        name: "product-variant-storage",
      }
    ),
    {
      name: "product-variant-store",
    }
  )
);
