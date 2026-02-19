import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Size } from "../interfaces/size.interface";

interface SizeState {
  sizes: Size[];
  selectedSize: Size | null;
  isLoading: boolean;

  setSizes: (sizes: Size[]) => void;
  setSelectedSize: (size: Size | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addSize: (size: Size) => void;
  updateSize: (size: Size) => void;
  deleteSize: (sizeId: number) => void;
}

export const useSizeStore = create<SizeState>()(
  devtools(
    persist(
      (set) => ({
        sizes: [],
        selectedSize: null,
        isLoading: false,

        setSizes: (sizes) => set({ sizes }),
        setSelectedSize: (selectedSize) => set({ selectedSize }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addSize: (size) => set((state) => ({ sizes: [...state.sizes, size] })),
        updateSize: (size) =>
          set((state) => ({
            sizes: state.sizes.map((s) => (s.id === size.id ? { ...s, ...size } : s)),
          })),
        deleteSize: (id) =>
          set((state) => ({
            sizes: state.sizes.filter((s) => s.id !== id),
          })),
      }),
      {
        name: "size-storage",
      }
    ),
    {
      name: "size-store",
    }
  )
);
