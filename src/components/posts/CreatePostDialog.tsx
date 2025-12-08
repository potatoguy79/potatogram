import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreatePostDialog: React.FC<CreatePostDialogProps> = ({ open, onOpenChange }) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !user?.id || !selectedFile) return;
      
      setIsUploading(true);

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(fileName);

      // Create post
      const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
      
      const { error: postError } = await supabase.from('posts').insert({
        profile_id: profile.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
      });

      if (postError) throw postError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['profile-posts'] });
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      setIsUploading(false);
      onOpenChange(false);
      toast({ title: 'Post created!' });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({ title: 'Failed to create post', variant: 'destructive' });
      console.error(error);
    },
  });

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreview(null);
      setCaption('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {!preview ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-4 hover:border-primary transition-colors"
            >
              <ImagePlus className="w-12 h-12 text-muted-foreground" />
              <span className="text-muted-foreground">
                Click to select a photo or video
              </span>
            </button>
          ) : (
            <div className="relative">
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
                <video
                  src={preview}
                  controls
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ) : (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg"
                />
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

          <div className="space-y-2">
            <Label>Caption</Label>
            <Input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="bg-secondary border-0"
              maxLength={2200}
            />
            <p className="text-xs text-muted-foreground text-right">
              {caption.length}/2200
            </p>
          </div>

          <Button
            onClick={() => createPostMutation.mutate()}
            disabled={!selectedFile || isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              'Share'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
