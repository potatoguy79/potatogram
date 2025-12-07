import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  User, 
  Phone, 
  Video, 
  Info, 
  Send, 
  Image as ImageIcon, 
  Paperclip,
  Smile,
  Mic,
  Check,
  CheckCheck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
}

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
  sender_id: string;
}

interface ChatAreaProps {
  conversationId: string;
  participant: Participant;
}

const ChatArea: React.FC<ChatAreaProps> = ({ conversationId, participant }) => {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 2000,
  });

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && profile?.id) {
      const unreadMessages = messages.filter(
        m => !m.is_read && m.sender_id !== profile.id
      );
      
      if (unreadMessages.length > 0) {
        supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id))
          .then(() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          });
      }
    }
  }, [messages, profile?.id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!message.trim() || !profile?.id) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: profile.id,
        content: message.trim(),
        message_type: 'text',
      });

      if (error) throw error;

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate();
    }
  };

  const isOnline = () => {
    const diff = Date.now() - new Date(participant.last_seen).getTime();
    return diff < 5 * 60 * 1000;
  };

  const getStatusText = () => {
    if (isOnline()) return 'Active now';
    const diff = Date.now() - new Date(participant.last_seen).getTime();
    if (diff < 60 * 60 * 1000) return `Active ${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `Active ${Math.floor(diff / 3600000)}h ago`;
    return formatDistanceToNow(new Date(participant.last_seen), { addSuffix: true });
  };

  const groupMessagesByDate = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = format(new Date(msg.created_at), 'MMM d, yyyy');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {participant.avatar_url ? (
                <img 
                  src={participant.avatar_url} 
                  alt={participant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            {isOnline() && (
              <div className="absolute bottom-0 right-0 online-indicator" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">{participant.display_name}</h3>
            <p className={cn(
              'text-xs',
              isOnline() ? 'text-active' : 'text-muted-foreground'
            )}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-accent rounded-full transition-colors">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              {participant.avatar_url ? (
                <img 
                  src={participant.avatar_url} 
                  alt={participant.username}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <h4 className="font-semibold text-lg">{participant.display_name}</h4>
            <p className="text-muted-foreground text-sm">@{participant.username}</p>
            <p className="text-muted-foreground text-sm mt-2">
              Send a message to start the conversation
            </p>
          </div>
        ) : (
          <>
            {groupMessagesByDate().map(group => (
              <div key={group.date}>
                <div className="flex items-center justify-center my-4">
                  <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full">
                    {group.date}
                  </span>
                </div>
                {group.messages.map((msg, idx) => {
                  const isSent = msg.sender_id === profile?.id;
                  const showTime = idx === group.messages.length - 1 || 
                    group.messages[idx + 1]?.sender_id !== msg.sender_id;

                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex mb-1',
                        isSent ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div className={cn(
                        'max-w-[70%]',
                        isSent ? 'items-end' : 'items-start'
                      )}>
                        <div className={cn(
                          'px-4 py-2',
                          isSent ? 'message-bubble-sent' : 'message-bubble-received'
                        )}>
                          {msg.message_type === 'image' && msg.file_url && (
                            <img 
                              src={msg.file_url} 
                              alt="Shared image"
                              className="max-w-full rounded-lg mb-1"
                            />
                          )}
                          {msg.content && (
                            <p className="text-sm break-words">{msg.content}</p>
                          )}
                        </div>
                        {showTime && (
                          <div className={cn(
                            'flex items-center gap-1 mt-1 px-2',
                            isSent ? 'justify-end' : 'justify-start'
                          )}>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                            {isSent && (
                              msg.is_read ? (
                                <CheckCheck className="w-3 h-3 text-primary" />
                              ) : (
                                <Check className="w-3 h-3 text-muted-foreground" />
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 hover:bg-accent rounded-full transition-colors">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <Input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Message..."
              className="bg-secondary border-0 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button type="button" className="p-1 hover:bg-accent rounded transition-colors">
                <ImageIcon className="w-5 h-5 text-muted-foreground" />
              </button>
              <button type="button" className="p-1 hover:bg-accent rounded transition-colors">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
          {message.trim() ? (
            <Button type="submit" size="icon" disabled={sendMessageMutation.isPending}>
              <Send className="w-5 h-5" />
            </Button>
          ) : (
            <button type="button" className="p-2 hover:bg-accent rounded-full transition-colors">
              <Mic className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ChatArea;
