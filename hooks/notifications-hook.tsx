'use client'

import CustomNotification, { INotification } from '@/components/notify/notification/notification';
import { ReactElement, useState, useRef } from 'react'

export default function useNotificationsHook() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const nextIdRef = useRef<number>(0);

  const createNotification = (notification: INotification): void => {
    const nextId = nextIdRef.current;
    nextIdRef.current += 1;

    setNotifications([
      ...notifications,
      {
        ...notification,
        id: nextId,
      }
    ])
  }

  const deleteNotification = (id: number): void => {
    setNotifications([
      ...notifications.filter((
        notification: INotification
      ) => notification.id !== id)
    ]);
  }

  const notificationElements = notifications.map(
    (notification: INotification): ReactElement => (
      <CustomNotification
        key={`notification-${notification.id}`}
        type={notification.type}
        isAutoClose={notification.isAutoClose}
        onDelete={() => deleteNotification(notification.id)}
      >
        {notification.children}
      </CustomNotification>
    )
  );

  return {
    notifications,
    createNotification,
    deleteNotification,
    notificationElements,
  }
}
