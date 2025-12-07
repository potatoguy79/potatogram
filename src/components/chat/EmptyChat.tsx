import React from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyChatProps {
  onNewMessage: () => void;
}

const EmptyChat: React.FC<EmptyChatProps> = ({ onNewMessage }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background">
      <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
        <Send className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-light mb-1">Your Messages</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Send private messages to a friend
      </p>
      <Button onClick={onNewMessage}>
        Send message
      </Button>
    </div>
  );
};

export default EmptyChat;
