import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Video, X, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({ open, onOpenChange }) => {
  const { profile } = useAuth();
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !mediaUrl.trim()) return;

      const { error } = await supabase.from('stories').insert({
        profile_id: profile.id,
        media_url: mediaUrl.trim(),
        media_type: mediaType,
        is_close_friends_only: isCloseFriendsOnly,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      onOpenChange(false);
      setMediaUrl('');
      setIsCloseFriendsOnly(false);
      toast({ title: 'Story shared!' });
    },
    onError: () => {
      toast({ title: 'Failed to share story', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mediaType === 'image' ? 'default' : 'outline'}
              onClick={() => setMediaType('image')}
              className="flex-1"
            >
              <Image className="w-4 h-4 mr-2" />
              Photo
            </Button>
            <Button
              type="button"
              variant={mediaType === 'video' ? 'default' : 'outline'}
              onClick={() => setMediaType('video')}
              className="flex-1"
            >
              <Video className="w-4 h-4 mr-2" />
              Video
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Media URL</Label>
            <input
              type="url"
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              placeholder={`Enter ${mediaType} URL...`}
              className="w-full bg-secondary border-0 rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {mediaUrl && (
            <div className="relative aspect-[9/16] max-h-64 bg-muted rounded-lg overflow-hidden">
              {mediaType === 'video' ? (
                <video src={mediaUrl} className="w-full h-full object-contain" controls />
              ) : (
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
              )}
            </div>
          )}

          <div className="flex items-center justify-between py-3 px-4 bg-close-friends/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-close-friends" />
              <div>
                <p className="font-medium text-sm">Close Friends</p>
                <p className="text-xs text-muted-foreground">Only visible to close friends</p>
              </div>
            </div>
            <Switch
              checked={isCloseFriendsOnly}
              onCheckedChange={setIsCloseFriendsOnly}
            />
          </div>

          <Button
            onClick={() => createStoryMutation.mutate()}
            disabled={!mediaUrl.trim() || createStoryMutation.isPending}
            className="w-full"
          >
            {createStoryMutation.isPending ? 'Sharing...' : 'Share to Story'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;
