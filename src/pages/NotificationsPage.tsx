import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Bell, Heart, UserPlus, MessageCircle, AtSign } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  // Placeholder notifications for UI demonstration
  const notifications = [
    {
      id: '1',
      type: 'follow',
      message: 'started following you',
      time: '2h ago',
      read: false,
    },
    {
      id: '2', 
      type: 'like',
      message: 'liked your story',
      time: '4h ago',
      read: true,
    },
    {
      id: '3',
      type: 'mention',
      message: 'mentioned you in their note',
      time: '1d ago',
      read: true,
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserPlus className="w-5 h-5 text-primary" />;
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-primary" />;
      case 'mention':
        return <AtSign className="w-5 h-5 text-primary" />;
      default:
        return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">Notifications</h1>

        <div className="space-y-1">
          {notifications.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>No notifications yet</p>
              <p className="text-sm mt-1">When someone interacts with you, you'll see it here</p>
            </div>
          ) : (
            notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex items-center gap-3 p-4 rounded-lg transition-colors ${
                  notification.read ? 'bg-card' : 'bg-accent'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">Someone</span> {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-8 p-4 bg-card rounded-xl text-center">
          <p className="text-muted-foreground text-sm">
            Full notification system coming soon!
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default NotificationsPage;
