import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Search, Check, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postUrl: string;
}

const SharePostDialog: React.FC<SharePostDialogProps> = ({
  open,
  onOpenChange,
  postId,
  postUrl,
}) => {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['share-users', search],
    queryFn: async () => {
      if (!profile?.id) return [];

      const query = supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', profile.id)
        .limit(20);

      if (search.trim()) {
        query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id && open,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || selected.length === 0) return;

      for (const userId of selected) {
        // Find or create conversation
        const { data: existingConvs } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('profile_id', profile.id);

        let conversationId: string | null = null;

        if (existingConvs && existingConvs.length > 0) {
          for (const conv of existingConvs) {
            const { data: otherParticipant } = await supabase
              .from('conversation_participants')
              .select('profile_id')
              .eq('conversation_id', conv.conversation_id)
              .eq('profile_id', userId)
              .maybeSingle();

            if (otherParticipant) {
              conversationId = conv.conversation_id;
              break;
            }
          }
        }

        if (!conversationId) {
          // Create new conversation
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({})
            .select('id')
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;

          // Add participants
          await supabase.from('conversation_participants').insert([
            { conversation_id: conversationId, profile_id: profile.id },
            { conversation_id: conversationId, profile_id: userId },
          ]);
        }

        // Send message with post
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: profile.id,
          content: `Shared a post: ${postUrl}`,
          message_type: 'text',
        });

        // Update conversation timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
      }
    },
    onSuccess: () => {
      toast({ title: 'Post shared!' });
      setSelected([]);
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: 'Failed to share post', variant: 'destructive' });
    },
  });

  const toggleSelect = (userId: string) => {
    setSelected(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle>Share post</DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="pl-9 bg-secondary border-0"
          />
        </div>

        <div className="max-h-60 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No users found</div>
          ) : (
            users.map(user => (
              <button
                key={user.id}
                onClick={() => toggleSelect(user.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors',
                  selected.includes(user.id) && 'bg-accent'
                )}
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                {selected.includes(user.id) && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <Button
          onClick={() => shareMutation.mutate()}
          disabled={selected.length === 0 || shareMutation.isPending}
          className="w-full mt-4"
        >
          <Send className="w-4 h-4 mr-2" />
          {shareMutation.isPending ? 'Sending...' : `Send to ${selected.length} ${selected.length === 1 ? 'person' : 'people'}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostDialog;
