import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Music, Heart } from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  likes_count?: number;
  is_liked?: boolean;
}

const NotesBar: React.FC = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
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
        .select(`*, profile:profiles (id, username, display_name, avatar_url)`)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get likes for notes
      const noteIds = data?.map(n => n.id) || [];
      const [likesData, myLikes] = await Promise.all([
        supabase.from('note_likes').select('note_id').in('note_id', noteIds),
        supabase.from('note_likes').select('note_id').eq('profile_id', profile.id).in('note_id', noteIds),
      ]);

      const likesCount: Record<string, number> = {};
      likesData.data?.forEach(l => { likesCount[l.note_id] = (likesCount[l.note_id] || 0) + 1; });
      const likedNotes = new Set(myLikes.data?.map(l => l.note_id) || []);

      return (data || []).map(n => ({
        ...n,
        likes_count: likesCount[n.id] || 0,
        is_liked: likedNotes.has(n.id),
      })) as Note[];
    },
    enabled: !!profile?.id,
  });

  const { data: myNote } = useQuery({
    queryKey: ['my-note', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase.from('notes').select('*').eq('profile_id', profile.id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !noteContent.trim()) return;
      await supabase.from('notes').insert({
        profile_id: profile.id,
        content: noteContent.trim(),
        music_track_name: trackName || null,
        music_artist: artist || null,
        music_album_art: albumArt || null,
      });
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
    onError: () => toast({ title: 'Failed to share note', variant: 'destructive' }),
  });

  const likeMutation = useMutation({
    mutationFn: async (note: Note) => {
      if (!profile?.id) return;
      if (note.is_liked) {
        await supabase.from('note_likes').delete().eq('note_id', note.id).eq('profile_id', profile.id);
      } else {
        await supabase.from('note_likes').insert({ note_id: note.id, profile_id: profile.id });
        // Notification
        if (note.profile.id !== profile.id) {
          await supabase.from('notifications').insert({ profile_id: note.profile.id, type: 'like', actor_id: profile.id, content_type: 'note', content_id: note.id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setSelectedNote(null);
    },
  });

  return (
    <div className="px-4 py-3 border-b border-border">
      <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
        {/* Create note button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <button className="flex flex-col items-center gap-1 min-w-fit">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-primary transition-colors">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center"><User className="w-6 h-6 text-muted-foreground" /></div>
                  )}
                </div>
                {myNote && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 max-w-20">
                    <p className="text-[10px] truncate">{myNote.content}</p>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Your note</span>
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Share a note</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>What's on your mind?</Label>
                <Input value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Share a thought..." maxLength={60} className="bg-secondary border-0" />
                <p className="text-xs text-muted-foreground text-right">{noteContent.length}/60</p>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3"><Music className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">Add music (optional)</span></div>
                <div className="space-y-2">
                  <Input value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="Song name" className="bg-secondary border-0" />
                  <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist" className="bg-secondary border-0" />
                  <Input value={albumArt} onChange={e => setAlbumArt(e.target.value)} placeholder="Album art URL (or search online)" className="bg-secondary border-0" />
                </div>
              </div>
              <Button onClick={() => createNoteMutation.mutate()} disabled={!noteContent.trim() || createNoteMutation.isPending} className="w-full">
                {createNoteMutation.isPending ? 'Sharing...' : 'Share note'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Other users' notes - Instagram style with bubble */}
        {notes.filter(note => note.profile.id !== profile?.id).map(note => (
          <button key={note.id} onClick={() => setSelectedNote(note)} className="flex flex-col items-center gap-1 min-w-fit group">
            <div className="relative">
              {/* Note bubble above avatar */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl px-2 py-1 max-w-24 shadow-md z-10">
                <p className="text-[10px] truncate text-center">{note.content}</p>
                {note.music_track_name && (
                  <p className="text-[8px] text-primary truncate text-center">♪ {note.music_track_name}</p>
                )}
              </div>
              {note.music_track_name && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-20">
                  <Music className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden mt-2 group-hover:ring-2 ring-primary transition-all">
                {note.profile.avatar_url ? (
                  <img src={note.profile.avatar_url} alt={note.profile.username} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-16">{note.profile.username}</span>
          </button>
        ))}
      </div>

      {/* Note detail dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="bg-card max-w-sm">
          {selectedNote && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {selectedNote.profile.avatar_url ? (
                    <img src={selectedNote.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
              </div>
              <p className="font-medium">{selectedNote.profile.username}</p>
              <div className="bg-secondary rounded-xl p-4">
                <p className="text-lg">{selectedNote.content}</p>
              </div>
              {selectedNote.music_track_name && (
                <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
                  {selectedNote.music_album_art ? (
                    <img src={selectedNote.music_album_art} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center"><Music className="w-6 h-6 text-primary-foreground" /></div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{selectedNote.music_track_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedNote.music_artist}</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => likeMutation.mutate(selectedNote)}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg hover:bg-accent transition-colors"
              >
                <Heart className={cn("w-5 h-5", selectedNote.is_liked && "fill-destructive text-destructive")} />
                <span>{selectedNote.likes_count || 0} likes</span>
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotesBar;
