import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Search, 
  MessageSquare, 
  Shield, 
  Users,
  Eye,
  ChevronRight,
  Lock
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
  created_at: string;
}

interface Message {
  id: string;
  content: string | null;
  message_type: string;
  created_at: string;
  sender_id: string;
  sender: {
    username: string;
    display_name: string;
  };
}

interface Conversation {
  id: string;
  participants: {
    username: string;
    display_name: string;
  }[];
}

const AdminPage: React.FC = () => {
  const { isAdmin, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [viewingMessages, setViewingMessages] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserProfile[];
    },
    enabled: isAdmin,
  });

  const { data: userConversations = [] } = useQuery({
    queryKey: ['admin-user-conversations', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return [];

      const { data: participantData } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', selectedUser.id);

      if (!participantData) return [];

      const conversationIds = participantData.map(p => p.conversation_id);
      const conversations: Conversation[] = [];

      for (const convId of conversationIds) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select(`
            profiles (
              username,
              display_name
            )
          `)
          .eq('conversation_id', convId);

        if (participants) {
          conversations.push({
            id: convId,
            participants: participants.map(p => (p.profiles as any)),
          });
        }
      }

      return conversations;
    },
    enabled: !!selectedUser?.id && isAdmin,
  });

  const { data: conversationMessages = [] } = useQuery({
    queryKey: ['admin-conversation-messages', selectedConversation],
    queryFn: async () => {
      if (!selectedConversation) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            username,
            display_name
          )
        `)
        .eq('conversation_id', selectedConversation)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selectedConversation && isAdmin,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersCount, messagesCount, conversationsCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('conversations').select('*', { count: 'exact', head: true }),
      ]);

      return {
        users: usersCount.count || 0,
        messages: messagesCount.count || 0,
        conversations: conversationsCount.count || 0,
      };
    },
    enabled: isAdmin,
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground animate-pulse-soft">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card p-6 rounded-xl">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.users || 0}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.messages || 0}</p>
                <p className="text-sm text-muted-foreground">Total Messages</p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-xl">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats?.conversations || 0}</p>
                <p className="text-sm text-muted-foreground">Conversations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search Users */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-10 bg-secondary border-0"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="bg-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">All Users</h2>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</p>
                  <p>Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* User Conversations Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="bg-card max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                View Conversations - @{selectedUser?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {userConversations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No conversations found</p>
              ) : (
                userConversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
                      setViewingMessages(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left"
                  >
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">
                        {conv.participants.map(p => p.display_name).join(' & ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conv.participants.map(p => '@' + p.username).join(', ')}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Messages Dialog */}
        <Dialog open={viewingMessages} onOpenChange={setViewingMessages}>
          <DialogContent className="bg-card max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-destructive" />
                Admin View - Conversation Messages
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin space-y-2 p-4">
              {conversationMessages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No messages in this conversation</p>
              ) : (
                conversationMessages.map(msg => (
                  <div key={msg.id} className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">@{msg.sender.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm">{msg.content || `[${msg.message_type}]`}</p>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminPage;
