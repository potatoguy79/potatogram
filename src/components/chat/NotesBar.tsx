import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Plus, Music } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Note {
  id: string;
  content: string;
  music_track_name: string | null;
  music_artist: string | null;
  music_album_art: string | null;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const NotesBar: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [trackName, setTrackName] = useState('');
  const [artist, setArtist] = useState('');
  const [albumArt, setAlbumArt] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Note[];
    },
    enabled: !!profile?.id,
  });

  const { data: myNote } = useQuery({
    queryKey: ['my-note', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('profile_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !noteContent.trim()) return;

      const { error } = await supabase.from('notes').insert({
        profile_id: profile.id,
        content: noteContent.trim(),
        music_track_name: trackName || null,
        music_artist: artist || null,
        music_album_art: albumArt || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['my-note'] });
      setIsOpen(false);
      setNoteContent('');
      setTrackName('');
      setArtist('');
      setAlbumArt('');
      toast({ title: 'Note shared!' });
    },
    onError: () => {
      toast({ title: 'Failed to share note', variant: 'destructive' });
    },
  });

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
        {/* Create note button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="flex flex-col items-center gap-1 min-w-fit">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary transition-colors">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.username}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {myNote ? myNote.content.slice(0, 10) + '...' : 'Your note'}
              </span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Share a note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>What's on your mind?</Label>
                <Input
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Share a thought..."
                  maxLength={60}
                  className="bg-secondary border-0"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {noteContent.length}/60
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Add music (optional)</span>
                </div>
                <div className="space-y-2">
                  <Input
                    value={trackName}
                    onChange={e => setTrackName(e.target.value)}
                    placeholder="Song name"
                    className="bg-secondary border-0"
                  />
                  <Input
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                    placeholder="Artist"
                    className="bg-secondary border-0"
                  />
                  <Input
                    value={albumArt}
                    onChange={e => setAlbumArt(e.target.value)}
                    placeholder="Album art URL"
                    className="bg-secondary border-0"
                  />
                </div>
              </div>

              <Button
                onClick={() => createNoteMutation.mutate()}
                disabled={!noteContent.trim() || createNoteMutation.isPending}
                className="w-full"
              >
                {createNoteMutation.isPending ? 'Sharing...' : 'Share note'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Other users' notes */}
        {notes
          .filter(note => note.profile.id !== profile?.id)
          .map(note => (
            <div key={note.id} className="flex flex-col items-center gap-1 min-w-fit">
              <div className="relative">
                {note.music_track_name && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10">
                    <Music className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {note.profile.avatar_url ? (
                    <img 
                      src={note.profile.avatar_url} 
                      alt={note.profile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
              </div>
              <div className="max-w-16 text-center">
                <p className="text-xs truncate">{note.content}</p>
                {note.music_track_name && (
                  <p className="text-[10px] text-primary truncate">
                    ♪ {note.music_track_name}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default NotesBar;
