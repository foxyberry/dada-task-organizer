import { useState, useEffect, useCallback } from 'react';

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof Notification !== 'undefined' && permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico', // Fallback icon
        ...options
      });
    }
  }, [permission]);

  return { permission, requestPermission, sendNotification };
}
