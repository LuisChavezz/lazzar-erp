export type NotificationType = "error" | "success" | "info";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAtLabel: string;
  createdAt: Date;
  isRead: boolean;
  route?: string | null;
}
