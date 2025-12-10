import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import VerifiedBadge from '@/components/ui/VerifiedBadge';
import SharePostDialog from './SharePostDialog';
import LikesDialog from './LikesDialog';

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
    is_verified?: boolean;
    verified_type?: string | null;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
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
          <span className="font-medium text-sm flex items-center gap-1">
            {post.profile.username}
            {post.profile.is_verified && (
              <VerifiedBadge type={post.profile.verified_type || 'blue'} />
            )}
          </span>
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
            autoPlay
            loop
            muted
            playsInline
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
            <button 
              onClick={() => setShareOpen(true)}
              className="hover:opacity-70 transition-opacity"
            >
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
        <button 
          onClick={() => setLikesOpen(true)}
          className="font-semibold text-sm mb-1 hover:underline"
        >
          {localLikesCount} {localLikesCount === 1 ? 'like' : 'likes'}
        </button>

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
          <CommentsSection postId={post.id} postOwnerId={post.profile.id} />
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <SharePostDialog 
        open={shareOpen} 
        onOpenChange={setShareOpen} 
        postId={post.id}
        postUrl={post.media_url}
      />

      {/* Likes Dialog */}
      <LikesDialog
        open={likesOpen}
        onOpenChange={setLikesOpen}
        postId={post.id}
      />
    </article>
  );
};

interface CommentWithLikes {
  id: string;
  content: string;
  created_at: string;
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  is_liked: boolean;
}

const CommentsSection: React.FC<{ postId: string; postOwnerId: string }> = ({ postId, postOwnerId }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['post-comments', postId],
    queryFn: async (): Promise<CommentWithLikes[]> => {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
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

      // Get like counts using raw SQL via rpc or manual count
      // Since comment_likes is new, we'll handle it gracefully
      const commentIds = data?.map(c => c.id) || [];
      
      // Fetch comment likes manually
      const likesResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_likes?comment_id=in.(${commentIds.join(',')})&select=comment_id`,
        {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      
      let likeCounts: { comment_id: string }[] = [];
      let userLikes: { comment_id: string }[] = [];
      
      if (likesResponse.ok) {
        likeCounts = await likesResponse.json();
        
        if (profile?.id) {
          const userLikesResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_likes?comment_id=in.(${commentIds.join(',')})&profile_id=eq.${profile.id}&select=comment_id`,
            {
              headers: {
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
            }
          );
          if (userLikesResponse.ok) {
            userLikes = await userLikesResponse.json();
          }
        }
      }

      const likeCountMap: Record<string, number> = {};
      likeCounts.forEach(l => {
        likeCountMap[l.comment_id] = (likeCountMap[l.comment_id] || 0) + 1;
      });

      const userLikedSet = new Set(userLikes.map(l => l.comment_id));

      return (data || []).map(c => ({
        id: c.id,
        content: c.content,
        created_at: c.created_at,
        profile: c.profile as any,
        likes_count: likeCountMap[c.id] || 0,
        is_liked: userLikedSet.has(c.id),
      }));
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

      // Create notification
      if (postOwnerId !== profile.id) {
        await supabase.from('notifications').insert({
          profile_id: postOwnerId,
          type: 'comment',
          actor_id: profile.id,
          content_type: 'post',
          content_id: postId,
          message: comment.trim().slice(0, 100),
        });
      }
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
          comments.map((c) => (
            <CommentItem key={c.id} comment={c} postId={postId} />
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

const CommentItem: React.FC<{ comment: CommentWithLikes; postId: string }> = ({ comment, postId }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(comment.is_liked);
  const [likesCount, setLikesCount] = useState(comment.likes_count);

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      
      const headers = {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      };
      
      if (isLiked) {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_likes?comment_id=eq.${comment.id}&profile_id=eq.${profile.id}`,
          { method: 'DELETE', headers }
        );
      } else {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/comment_likes`,
          { 
            method: 'POST', 
            headers,
            body: JSON.stringify({ comment_id: comment.id, profile_id: profile.id })
          }
        );
      }
    },
    onMutate: () => {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    },
    onError: () => {
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
    },
  });

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
        {comment.profile.avatar_url ? (
          <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm">
          <span className="font-semibold mr-2">{comment.profile.username}</span>
          {comment.content}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </p>
          {likesCount > 0 && (
            <p className="text-xs text-muted-foreground">{likesCount} likes</p>
          )}
        </div>
      </div>
      <button onClick={() => likeMutation.mutate()} className="hover:opacity-70">
        <Heart className={cn("w-4 h-4", isLiked && "fill-destructive text-destructive")} />
      </button>
    </div>
  );
};

export default PostCard;
