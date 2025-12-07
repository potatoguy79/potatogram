import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Search, Check } from 'lucide-react';
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

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversationId: string, participant: Profile) => void;
}

const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onOpenChange,
  onConversationCreated,
}) => {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Profile | null>(null);
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['search-users', search],
    queryFn: async () => {
      if (!search.trim() || !profile?.id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .neq('id', profile.id)
        .or(`username.ilike.%${search}%,display_name.ilike.%${search}%`)
        .limit(10);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!search.trim() && !!profile?.id,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !profile?.id) return null;

      // Check if conversation already exists
      const { data: existingConvs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('profile_id', profile.id);

      if (existingConvs && existingConvs.length > 0) {
        for (const conv of existingConvs) {
          const { data: otherParticipant } = await supabase
            .from('conversation_participants')
            .select('profile_id')
            .eq('conversation_id', conv.conversation_id)
            .eq('profile_id', selected.id)
            .maybeSingle();

          if (otherParticipant) {
            return { id: conv.conversation_id, isNew: false };
          }
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select('id')
        .single();

      if (convError) throw convError;

      // Add participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, profile_id: profile.id },
          { conversation_id: newConv.id, profile_id: selected.id },
        ]);

      if (partError) throw partError;

      return { id: newConv.id, isNew: true };
    },
    onSuccess: (result) => {
      if (result && selected) {
        onConversationCreated(result.id, selected);
        onOpenChange(false);
        setSearch('');
        setSelected(null);
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    },
  });

  const handleNext = () => {
    if (selected) {
      createConversationMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">New message</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            <span className="font-medium">To:</span>
            <div className="flex-1 flex items-center gap-2 flex-wrap">
              {selected && (
                <div className="flex items-center gap-1 bg-primary/20 text-primary px-2 py-1 rounded-full text-sm">
                  {selected.display_name}
                  <button
                    onClick={() => setSelected(null)}
                    className="ml-1 hover:text-destructive"
                  >
                    ×
                  </button>
                </div>
              )}
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : users.length === 0 && search.trim() ? (
              <div className="p-4 text-center text-muted-foreground">
                No users found
              </div>
            ) : (
              users.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelected(user)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors',
                    selected?.id === user.id && 'bg-accent'
                  )}
                >
                  <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{user.display_name}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                  {selected?.id === user.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="p-4 border-t border-border">
            <Button
              onClick={handleNext}
              disabled={!selected || createConversationMutation.isPending}
              className="w-full"
            >
              {createConversationMutation.isPending ? 'Creating...' : 'Chat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewConversationDialog;
