import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, User, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  caption: string | null;
  media_url: string;
  media_type: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [localIsLiked, setLocalIsLiked] = useState(post.is_liked);
  const [localLikesCount, setLocalLikesCount] = useState(post.likes_count);
  const [localIsSaved, setLocalIsSaved] = useState(post.is_saved);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      
      if (localIsLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', profile.id);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: post.id, profile_id: profile.id });
        
        // Create notification
        if (post.profile.id !== profile.id) {
          await supabase.from('notifications').insert({
            profile_id: post.profile.id,
            type: 'like',
            actor_id: profile.id,
            content_type: 'post',
            content_id: post.id,
          });
        }
      }
    },
    onMutate: () => {
      setLocalIsLiked(!localIsLiked);
      setLocalLikesCount(prev => localIsLiked ? prev - 1 : prev + 1);
    },
    onError: () => {
      setLocalIsLiked(localIsLiked);
      setLocalLikesCount(localLikesCount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      
      if (localIsSaved) {
        await supabase
          .from('post_saves')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', profile.id);
      } else {
        await supabase
          .from('post_saves')
          .insert({ post_id: post.id, profile_id: profile.id });
      }
    },
    onMutate: () => {
      setLocalIsSaved(!localIsSaved);
    },
    onError: () => {
      setLocalIsSaved(localIsSaved);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      toast({ title: localIsSaved ? 'Removed from saved' : 'Saved!' });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !comment.trim()) return;
      
      await supabase.from('post_comments').insert({
        post_id: post.id,
        profile_id: profile.id,
        content: comment.trim(),
      });

      // Create notification
      if (post.profile.id !== profile.id) {
        await supabase.from('notifications').insert({
          profile_id: post.profile.id,
          type: 'comment',
          actor_id: profile.id,
          content_type: 'post',
          content_id: post.id,
          message: comment.trim().slice(0, 100),
        });
      }
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
      toast({ title: 'Comment added!' });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      await supabase.from('reports').insert({
        reporter_id: profile.id,
        content_type: 'post',
        content_id: post.id,
        reason: 'Reported by user',
      });
    },
    onSuccess: () => {
      toast({ title: 'Post reported. Admins will review it.' });
    },
  });

  return (
    <article className="bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <button
          onClick={() => navigate(`/profile/${post.profile.username}`)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {post.profile.avatar_url ? (
              <img 
                src={post.profile.avatar_url} 
                alt={post.profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <span className="font-medium text-sm">{post.profile.username}</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-accent rounded-full transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card">
            <DropdownMenuItem onClick={() => reportMutation.mutate()}>
              <Flag className="w-4 h-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Media */}
      <div className="aspect-square bg-muted">
        {post.media_type === 'video' ? (
          <video
            src={post.media_url}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={post.media_url}
            alt="Post"
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => likeMutation.mutate()}
              className="hover:opacity-70 transition-opacity"
            >
              <Heart className={cn(
                "w-6 h-6",
                localIsLiked && "fill-destructive text-destructive"
              )} />
            </button>
            <button 
              onClick={() => setCommentsOpen(true)}
              className="hover:opacity-70 transition-opacity"
            >
              <MessageCircle className="w-6 h-6" />
            </button>
            <button className="hover:opacity-70 transition-opacity">
              <Send className="w-6 h-6" />
            </button>
          </div>
          <button 
            onClick={() => saveMutation.mutate()}
            className="hover:opacity-70 transition-opacity"
          >
            <Bookmark className={cn(
              "w-6 h-6",
              localIsSaved && "fill-foreground"
            )} />
          </button>
        </div>

        {/* Likes count */}
        <p className="font-semibold text-sm mb-1">
          {localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}
        </p>

        {/* Caption */}
        {post.caption && (
          <p className="text-sm">
            <span className="font-semibold mr-2">{post.profile.username}</span>
            {post.caption}
          </p>
        )}

        {/* Comments preview */}
        {post.comments_count > 0 && (
          <button 
            onClick={() => setCommentsOpen(true)}
            className="text-sm text-muted-foreground mt-1"
          >
            View all {post.comments_count} comments
          </button>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Add comment */}
      <div className="flex items-center gap-2 px-3 pb-3 border-t border-border pt-3">
        <Input
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="bg-transparent border-0 focus-visible:ring-0 px-0"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => commentMutation.mutate()}
          disabled={!comment.trim() || commentMutation.isPending}
          className="text-primary hover:text-primary"
        >
          Post
        </Button>
      </div>

      {/* Comments Dialog */}
      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="bg-card max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <CommentsSection postId={post.id} />
        </DialogContent>
      </Dialog>
    </article>
  );
};

const CommentsSection: React.FC<{ postId: string }> = ({ postId }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !comment.trim()) return;
      await supabase.from('post_comments').insert({
        post_id: postId,
        profile_id: profile.id,
        content: comment.trim(),
      });
    },
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['feed-posts'] });
    },
  });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 py-4">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground">No comments yet</p>
        ) : (
          comments.map((c: any) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {c.profile.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-semibold mr-2">{c.profile.username}</span>
                  {c.content}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <Input
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-secondary border-0"
        />
        <Button
          onClick={() => addCommentMutation.mutate()}
          disabled={!comment.trim() || addCommentMutation.isPending}
          size="sm"
        >
          Post
        </Button>
      </div>
    </div>
  );
};

// Need to import useQuery in the component
import { useQuery } from '@tanstack/react-query';

export default PostCard;
