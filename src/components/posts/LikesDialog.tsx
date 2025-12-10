import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from '@/components/ui/VerifiedBadge';

interface LikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
}

const LikesDialog: React.FC<LikesDialogProps> = ({ open, onOpenChange, postId }) => {
  const navigate = useNavigate();

  const { data: likes = [], isLoading } = useQuery({
    queryKey: ['post-likes', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_likes')
        .select(`
          id,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            verified_type
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-sm">
        <DialogHeader>
          <DialogTitle>Likes</DialogTitle>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : likes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No likes yet</div>
          ) : (
            likes.map((like: any) => (
              <button
                key={like.id}
                onClick={() => {
                  navigate(`/profile/${like.profile.username}`);
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {like.profile.avatar_url ? (
                    <img src={like.profile.avatar_url} alt={like.profile.username} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium flex items-center gap-1">
                    {like.profile.username}
                    {like.profile.is_verified && (
                      <VerifiedBadge type={like.profile.verified_type || 'blue'} />
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{like.profile.display_name}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LikesDialog;
