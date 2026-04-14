export interface UpcomingTask {
  id: string;
  title: string;
  shortDescription: string;
  comments?: string;
  allDay: boolean;
  startDate: string;
  endDate: string;
}
