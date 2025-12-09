import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, Video, X, Users, Loader2 } from 'lucide-react';
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
  const { profile, user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCloseFriendsOnly, setIsCloseFriendsOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const createStoryMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !user?.id || !selectedFile) return;

      setIsUploading(true);

      // Upload to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('stories')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('stories')
        .getPublicUrl(fileName);

      const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';

      const { error } = await supabase.from('stories').insert({
        profile_id: profile.id,
        media_url: publicUrl,
        media_type: mediaType,
        is_close_friends_only: isCloseFriendsOnly,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      handleClose();
      toast({ title: 'Story shared!' });
    },
    onError: () => {
      setIsUploading(false);
      toast({ title: 'Failed to share story', variant: 'destructive' });
    },
  });

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreview(null);
      setIsCloseFriendsOnly(false);
      setIsUploading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[9/16] max-h-80 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors"
            >
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                  <Image className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Photo</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Video className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Video</span>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">
                Click to select from your library
              </span>
            </button>
          ) : (
            <div className="relative aspect-[9/16] max-h-80 bg-muted rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>
              {selectedFile?.type.startsWith('video/') ? (
                <video src={preview} className="w-full h-full object-contain" controls />
              ) : (
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center justify-between py-3 px-4 bg-[hsl(var(--close-friends))]/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[hsl(var(--close-friends))]" />
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
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              'Share to Story'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStoryDialog;