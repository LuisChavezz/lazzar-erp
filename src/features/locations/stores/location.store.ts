import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Location } from '../interfaces/location.interface';

interface LocationState {
  locations: Location[];
  selectedLocation: Location | null;
  isLoading: boolean;
  
  // Actions
  setLocations: (locations: Location[]) => void;
  setSelectedLocation: (location: Location | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  addLocation: (location: Location) => void;
  updateLocation: (id: string, location: Partial<Location>) => void;
  deleteLocation: (id: string) => void;
}

export const useLocationStore = create<LocationState>()(
  devtools(
    persist(
      (set) => ({
        locations: [],
        selectedLocation: null,
        isLoading: false,

        setLocations: (locations) => set({ locations }),
        setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
        setIsLoading: (isLoading) => set({ isLoading }),
        
        addLocation: (location) => 
          set((state) => ({ locations: [...state.locations, location] })),
          
        updateLocation: (id, updatedLocation) =>
          set((state) => ({
            locations: state.locations.map((l) =>
              l.id === id ? { ...l, ...updatedLocation } : l
            ),
          })),
          
        deleteLocation: (id) =>
          set((state) => ({
            locations: state.locations.filter((l) => l.id !== id),
          })),
      }),
      {
        name: 'location-storage',
      }
    )
  )
);
