import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import StoriesBar from '@/components/stories/StoriesBar';
import PostCard from '@/components/posts/PostCard';
import CreatePostDialog from '@/components/posts/CreatePostDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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

const HomePage: React.FC = () => {
  const { profile } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['feed-posts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get posts from people the user follows + their own posts
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id);

      const followingIds = following?.map(f => f.following_id) || [];
      followingIds.push(profile.id);

      const { data: postsData, error } = await supabase
        .from('posts')
        .select(`
          *,
          profile:profiles (
            id,
            username,
            display_name,
            avatar_url,
            is_verified,
            verified_type
          )
        `)
        .in('profile_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get likes and saves for each post
      const postIds = postsData?.map(p => p.id) || [];
      
      const [likesData, savesData, likesCount, commentsCount] = await Promise.all([
        supabase
          .from('post_likes')
          .select('post_id')
          .eq('profile_id', profile.id)
          .in('post_id', postIds),
        supabase
          .from('post_saves')
          .select('post_id')
          .eq('profile_id', profile.id)
          .in('post_id', postIds),
        supabase
          .from('post_likes')
          .select('post_id')
          .in('post_id', postIds),
        supabase
          .from('post_comments')
          .select('post_id')
          .in('post_id', postIds),
      ]);

      const likedPosts = new Set(likesData.data?.map(l => l.post_id) || []);
      const savedPosts = new Set(savesData.data?.map(s => s.post_id) || []);
      
      const likesCountMap: Record<string, number> = {};
      likesCount.data?.forEach(l => {
        likesCountMap[l.post_id] = (likesCountMap[l.post_id] || 0) + 1;
      });

      const commentsCountMap: Record<string, number> = {};
      commentsCount.data?.forEach(c => {
        commentsCountMap[c.post_id] = (commentsCountMap[c.post_id] || 0) + 1;
      });

      return (postsData || []).map(post => ({
        ...post,
        likes_count: likesCountMap[post.id] || 0,
        comments_count: commentsCountMap[post.id] || 0,
        is_liked: likedPosts.has(post.id),
        is_saved: savedPosts.has(post.id),
      })) as Post[];
    },
    enabled: !!profile?.id,
  });

  return (
    <MainLayout>
      <div className="max-w-xl mx-auto">
        <StoriesBar />
        
        {/* Create post button */}
        <div className="p-4 border-b border-border">
          <Button 
            onClick={() => setCreateOpen(true)}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <Plus className="w-4 h-4" />
            Create a new post
          </Button>
        </div>

        {/* Posts feed */}
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading posts...
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No posts yet. Follow people to see their posts here!</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>

        <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </MainLayout>
  );
};

export default HomePage;
