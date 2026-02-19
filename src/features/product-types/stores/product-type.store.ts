import { create } from "zustand";
import { ProductType } from "../interfaces/product-type.interface";
import { devtools, persist } from "zustand/middleware";


interface ProductTypeState {
  productTypes: ProductType[];
  selectedProductType: ProductType;
  isLoading: boolean;

  // Actions
  setProductTypes: (productTypes: ProductType[]) => void;
  setSelectedProductType: (productType: ProductType) => void;
  setIsLoading: (isLoading: boolean) => void;
  addProductType: (productType: ProductType) => void;
  updateProductType: (productType: ProductType) => void;
  deleteProductType: (productType: ProductType) => void;
}

export const useProductTypeStore = create<ProductTypeState>()(
  devtools(
    persist(
      (set) => ({
        productTypes: [],
        selectedProductType: {} as ProductType,
        isLoading: false,

        setProductTypes: (productTypes) => set({ productTypes }),
        setSelectedProductType: (productType) => set({ selectedProductType: productType }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addProductType: (productType) => set((state) => ({ productTypes: [...state.productTypes, productType] })),

        updateProductType: (productType) => set((state) => ({ productTypes: state.productTypes.map((pt) => pt.id === productType.id ? productType : pt) })),

        deleteProductType: (productType) => set((state) => ({ productTypes: state.productTypes.filter((pt) => pt.id !== productType.id) })),
      }),
      { name: "product-types" }
    ),
    { name: "product-type-store" }
  )
);