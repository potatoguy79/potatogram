import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { User, Search, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import NotesBar from './NotesBar';

interface Conversation {
  id: string;
  updated_at: string;
  participant: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    last_seen: string;
  };
  lastMessage: {
    content: string | null;
    message_type: string;
    created_at: string;
    sender_id: string;
  } | null;
  unreadCount: number;
}

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string, participant: Conversation['participant']) => void;
  onNewConversation: () => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ selectedId, onSelect, onNewConversation }) => {
  const { profile } = useAuth();
  const [search, setSearch] = React.useState('');

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            updated_at
          )
        `)
        .eq('profile_id', profile.id);

      if (!participantData || participantData.length === 0) return [];

      const conversationIds = participantData.map(p => p.conversation_id);

      const conversationsWithDetails: Conversation[] = [];

      for (const convId of conversationIds) {
        // Get other participant
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select(`
            profiles (
              id,
              username,
              display_name,
              avatar_url,
              last_seen
            )
          `)
          .eq('conversation_id', convId)
          .neq('profile_id', profile.id)
          .single();

        if (!otherParticipant?.profiles) continue;

        // Get last message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, message_type, created_at, sender_id')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get unread count
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .eq('is_read', false)
          .neq('sender_id', profile.id);

        const conv = participantData.find(p => p.conversation_id === convId);

        conversationsWithDetails.push({
          id: convId,
          updated_at: (conv?.conversations as any)?.updated_at || '',
          participant: otherParticipant.profiles as any,
          lastMessage: lastMsg,
          unreadCount: count || 0,
        });
      }

      return conversationsWithDetails.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
    enabled: !!profile?.id,
    refetchInterval: 5000,
  });

  const filteredConversations = conversations.filter(conv =>
    conv.participant.username.toLowerCase().includes(search.toLowerCase()) ||
    conv.participant.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  };

  const getLastSeenText = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    if (diff < 5 * 60 * 1000) return 'Active now';
    if (diff < 60 * 60 * 1000) return `Active ${Math.floor(diff / 60000)}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `Active ${Math.floor(diff / 3600000)}h ago`;
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
  };

  const getMessagePreview = (conv: Conversation) => {
    if (!conv.lastMessage) return 'No messages yet';
    if (conv.lastMessage.message_type === 'image') {
      return conv.lastMessage.sender_id === profile?.id ? 'You sent a photo' : 'Sent a photo';
    }
    if (conv.lastMessage.message_type === 'file') {
      return conv.lastMessage.sender_id === profile?.id ? 'You sent a file' : 'Sent a file';
    }
    const prefix = conv.lastMessage.sender_id === profile?.id ? 'You: ' : '';
    return prefix + (conv.lastMessage.content || '');
  };

  return (
    <div className="w-80 border-r border-border h-screen flex flex-col bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{profile?.username}</h2>
          <button
            onClick={onNewConversation}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Edit className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>
      </div>

      <NotesBar />

      <div className="flex items-center justify-between px-4 py-2">
        <span className="font-semibold text-sm">Messages</span>
        <button className="text-muted-foreground text-sm hover:text-foreground">
          Requests
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {search ? 'No conversations found' : 'No messages yet'}
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id, conv.participant)}
              className={cn(
                'conversation-item',
                selectedId === conv.id && 'conversation-item-active'
              )}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {conv.participant.avatar_url ? (
                    <img 
                      src={conv.participant.avatar_url} 
                      alt={conv.participant.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                {isOnline(conv.participant.last_seen) && (
                  <div className="absolute bottom-0 right-0 online-indicator" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{conv.participant.display_name}</span>
                  {conv.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.lastMessage.created_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-sm truncate',
                    conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}>
                    {getMessagePreview(conv)}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                  )}
                </div>
                {isOnline(conv.participant.last_seen) && (
                  <p className="text-xs text-active">Active now</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
