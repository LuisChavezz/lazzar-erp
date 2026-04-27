import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface GoogleCalendarState {
  /** ID del evento de Google Calendar actualmente seleccionado, o null si no hay ninguno. */
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  clearSelectedEvent: () => void;
}

export const useGoogleCalendarStore = create<GoogleCalendarState>()(
  devtools(
    (set) => ({
      selectedEventId: null,
      setSelectedEventId: (id) => set({ selectedEventId: id }),
      clearSelectedEvent: () => set({ selectedEventId: null }),
    }),
    { name: "google-calendar" },
  ),
);
