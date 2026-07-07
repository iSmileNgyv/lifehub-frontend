import data from '@/mock/notifications.json';
import type { Notification } from '@/types';

let notifications: Notification[] = data as Notification[];

export const notificationService = {
  getAll: (): Notification[] => notifications,

  getUnread: (): Notification[] => notifications.filter((n) => !n.read),

  markAsRead: (id: string): void => {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
  },

  markAllAsRead: (): void => {
    notifications = notifications.map((n) => ({ ...n, read: true }));
  },
};
