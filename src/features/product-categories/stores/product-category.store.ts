import { create } from "zustand";
import { ProductCategory } from "../interfaces/product-category.interface";
import { devtools, persist } from "zustand/middleware";


interface ProductCategoryState {
  categories: ProductCategory[];
  selectedCategory: ProductCategory | null;
  isLoading: boolean;

  // Actions
  setCategories: (categories: ProductCategory[]) => void;
  setSelectedCategory: (category: ProductCategory | null) => void;
  setIsLoading: (loading: boolean) => void;
  addCategory: (category: ProductCategory) => void;
  updateCategory: (category: ProductCategory) => void;
  deleteCategory: (categoryId: number) => void;
}

export const useProductCategoryStore = create<ProductCategoryState>()(
  devtools(
    persist(
      (set) => ({
        categories: [],
        selectedCategory: null,
        isLoading: false,

        setCategories: (categories) => set({ categories }),
        setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
        setIsLoading: (isLoading) => set({ isLoading }),
        
        addCategory: (category) => 
          set((state) => ({ categories: [...state.categories, category] })),
          
        updateCategory: (category) =>
          set((state) => ({
            categories: state.categories.map((c) =>
              c.id === category.id ? { ...c, ...category } : c
            ),
          })),
          
        deleteCategory: (id) =>
          set((state) => ({
            categories: state.categories.filter((c) => c.id !== id),
          })),
      }),
      {
        name: "product-category-storage",
      }
    ),
    {
      name: "product-category-store",
    }
  )
);
