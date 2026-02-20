import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Product } from "../interfaces/product.interface";

interface ProductState {
  products: Product[];
  selectedProduct: Product | null;
  isLoading: boolean;

  setProducts: (products: Product[]) => void;
  setSelectedProduct: (product: Product | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: number) => void;
}

export const useProductStore = create<ProductState>()(
  devtools(
    persist(
      (set) => ({
        products: [],
        selectedProduct: null,
        isLoading: false,

        setProducts: (products) => set({ products }),
        setSelectedProduct: (selectedProduct) => set({ selectedProduct }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
        updateProduct: (product) =>
          set((state) => ({
            products: state.products.map((p) => (p.id === product.id ? { ...p, ...product } : p)),
          })),
        deleteProduct: (id) =>
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
          })),
      }),
      {
        name: "product-storage",
      }
    ),
    {
      name: "product-store",
    }
  )
);
