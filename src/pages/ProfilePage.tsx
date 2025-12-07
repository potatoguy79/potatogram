import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { User, Settings, Grid3X3, Bookmark, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileData {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
}

const ProfilePage: React.FC = () => {
  const { username } = useParams();
  const { profile: myProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');

  const isOwnProfile = !username || username === myProfile?.username;

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', username || myProfile?.username],
    queryFn: async () => {
      const targetUsername = username || myProfile?.username;
      if (!targetUsername) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', targetUsername)
        .maybeSingle();

      if (error) throw error;
      return data as ProfileData | null;
    },
    enabled: !!myProfile?.username,
  });

  const { data: followersCount = 0 } = useQuery({
    queryKey: ['followers-count', profileData?.id],
    queryFn: async () => {
      if (!profileData?.id) return 0;
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id);
      return count || 0;
    },
    enabled: !!profileData?.id,
  });

  const { data: followingCount = 0 } = useQuery({
    queryKey: ['following-count', profileData?.id],
    queryFn: async () => {
      if (!profileData?.id) return 0;
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id);
      return count || 0;
    },
    enabled: !!profileData?.id,
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['is-following', myProfile?.id, profileData?.id],
    queryFn: async () => {
      if (!myProfile?.id || !profileData?.id || isOwnProfile) return false;
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', myProfile.id)
        .eq('following_id', profileData.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!myProfile?.id && !!profileData?.id && !isOwnProfile,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!myProfile?.id || !profileData?.id) return;
      
      if (isFollowing) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myProfile.id)
          .eq('following_id', profileData.id);
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: myProfile.id,
            following_id: profileData.id,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['is-following'] });
      queryClient.invalidateQueries({ queryKey: ['followers-count'] });
      toast({ title: isFollowing ? 'Unfollowed' : 'Following!' });
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground animate-pulse-soft">Loading...</p>
        </div>
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="flex items-start gap-8 mb-8">
          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
            {profileData.avatar_url ? (
              <img 
                src={profileData.avatar_url} 
                alt={profileData.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-xl font-light">{profileData.username}</h1>
              {isOwnProfile ? (
                <>
                  <Button variant="secondary" size="sm">
                    Edit profile
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  variant={isFollowing ? 'secondary' : 'default'}
                  size="sm"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
            </div>

            <div className="flex gap-8 mb-4">
              <div>
                <span className="font-semibold">0</span>
                <span className="text-muted-foreground ml-1">posts</span>
              </div>
              <button className="hover:opacity-70 transition-opacity">
                <span className="font-semibold">{followersCount}</span>
                <span className="text-muted-foreground ml-1">followers</span>
              </button>
              <button className="hover:opacity-70 transition-opacity">
                <span className="font-semibold">{followingCount}</span>
                <span className="text-muted-foreground ml-1">following</span>
              </button>
            </div>

            <div>
              <p className="font-semibold">{profileData.display_name}</p>
              {profileData.bio && (
                <p className="text-sm mt-1 whitespace-pre-wrap">{profileData.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-border">
          <div className="flex justify-center gap-12">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                activeTab === 'posts' 
                  ? 'border-foreground text-foreground' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Posts</span>
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                  activeTab === 'saved' 
                    ? 'border-foreground text-foreground' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">Saved</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('tagged')}
              className={`flex items-center gap-2 py-4 border-t-2 transition-colors ${
                activeTab === 'tagged' 
                  ? 'border-foreground text-foreground' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Tagged</span>
            </button>
          </div>
        </div>

        {/* Posts Grid - Coming Soon */}
        <div className="py-16 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-foreground flex items-center justify-center">
            <Grid3X3 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-light mb-2">Posts coming soon!</h3>
          <p className="text-muted-foreground">Stay tuned for the ability to share posts.</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
