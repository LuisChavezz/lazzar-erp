import { useQuery } from "@tanstack/react-query";
import { getCalendars } from "../services/actions";
import { Calendar } from "../interfaces/calendar.interface";

export const useCalendars = () => {
  const {
    data: calendars = [],
    isLoading,
    isError,
    error,
  } = useQuery<Calendar[]>({
    queryKey: ["calendars"],
    queryFn: getCalendars,
  });

  return {
    calendars,
    isLoading,
    isError,
    error,
  };
};
