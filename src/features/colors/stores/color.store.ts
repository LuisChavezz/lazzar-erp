import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { Color } from "../interfaces/color.interface";

interface ColorState {
  colors: Color[];
  selectedColor: Color | null;
  isLoading: boolean;

  setColors: (colors: Color[]) => void;
  setSelectedColor: (color: Color | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addColor: (color: Color) => void;
  updateColor: (color: Color) => void;
  deleteColor: (colorId: number) => void;
}

export const useColorStore = create<ColorState>()(
  devtools(
    persist(
      (set) => ({
        colors: [],
        selectedColor: null,
        isLoading: false,

        setColors: (colors) => set({ colors }),
        setSelectedColor: (selectedColor) => set({ selectedColor }),
        setIsLoading: (isLoading) => set({ isLoading }),

        addColor: (color) => set((state) => ({ colors: [...state.colors, color] })),
        updateColor: (color) =>
          set((state) => ({
            colors: state.colors.map((c) => (c.id === color.id ? { ...c, ...color } : c)),
          })),
        deleteColor: (id) =>
          set((state) => ({
            colors: state.colors.filter((c) => c.id !== id),
          })),
      }),
      {
        name: "color-storage",
      }
    ),
    {
      name: "color-store",
    }
  )
);
