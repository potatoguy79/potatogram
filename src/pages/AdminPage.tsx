import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  User, 
  Search, 
  MessageSquare, 
  Shield, 
  Users,
  Eye,
  ChevronRight,
  Lock,
  BadgeCheck,
  LogIn,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
  created_at: string;
  is_verified: boolean;
  verified_type: string | null;
  badge_text: string | null;
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
  const { isAdmin, isLoading, impersonateUser, impersonatedProfile, exitImpersonation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [viewingMessages, setViewingMessages] = useState(false);
  const [badgeDialogUser, setBadgeDialogUser] = useState<UserProfile | null>(null);
  const [badgeType, setBadgeType] = useState<string>('');
  const [badgeText, setBadgeText] = useState('');

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

  const updateBadgeMutation = useMutation({
    mutationFn: async ({ userId, type, text }: { userId: string; type: string | null; text: string | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !!type, verified_type: type, badge_text: text })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setBadgeDialogUser(null);
      setBadgeType('');
      setBadgeText('');
      toast({ title: 'Badge updated!' });
    },
  });

  const handleImpersonate = (user: UserProfile) => {
    impersonateUser(user as any);
    toast({ title: `Now viewing as ${user.username}`, description: 'You can browse the app as this user' });
    navigate('/');
  };

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
        {/* Impersonation Banner */}
        {impersonatedProfile && (
          <div className="mb-6 p-4 bg-destructive/20 border border-destructive rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium">Admin Mode: Viewing as <strong>@{impersonatedProfile.username}</strong></p>
              <p className="text-sm text-muted-foreground">You are browsing the app as this user</p>
            </div>
            <Button variant="destructive" onClick={exitImpersonation}>
              <X className="w-4 h-4 mr-2" /> Exit Impersonation
            </Button>
          </div>
        )}

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
              <div
                key={user.id}
                className="flex items-center gap-3 p-4 hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-medium truncate">{user.display_name}</p>
                    <VerifiedBadge type={user.verified_type} />
                    {user.badge_text && (
                      <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">{user.badge_text}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground hidden md:block">
                  <p>Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</p>
                  <p>Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setSelectedUser(user)} title="View Conversations">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setBadgeDialogUser(user); setBadgeType(user.verified_type || ''); setBadgeText(user.badge_text || ''); }} title="Manage Badge">
                    <BadgeCheck className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleImpersonate(user)} title="Login as User">
                    <LogIn className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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

        {/* Badge Management Dialog */}
        <Dialog open={!!badgeDialogUser} onOpenChange={() => setBadgeDialogUser(null)}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Manage Badge - @{badgeDialogUser?.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Badge Type</label>
                <Select value={badgeType} onValueChange={setBadgeType}>
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue placeholder="Select badge type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Badge</SelectItem>
                    <SelectItem value="blue">
                      <span className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-primary" /> Blue (Developer/Admin)
                      </span>
                    </SelectItem>
                    <SelectItem value="red">
                      <span className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-destructive" /> Red (Special)
                      </span>
                    </SelectItem>
                    <SelectItem value="gold">
                      <span className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-yellow-500" /> Gold (Test Account)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Badge Text (optional)</label>
                <Input
                  value={badgeText}
                  onChange={e => setBadgeText(e.target.value)}
                  placeholder="e.g., Developer, Beta Tester"
                  className="bg-secondary border-0"
                />
              </div>
              <Button
                onClick={() => updateBadgeMutation.mutate({
                  userId: badgeDialogUser!.id,
                  type: badgeType === 'none' ? null : badgeType,
                  text: badgeText || null,
                })}
                disabled={updateBadgeMutation.isPending}
                className="w-full"
              >
                {updateBadgeMutation.isPending ? 'Saving...' : 'Save Badge'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default AdminPage;