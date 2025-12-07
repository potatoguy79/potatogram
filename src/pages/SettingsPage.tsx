import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Moon,
  Sun,
  User,
  Users,
  Eye,
  Bell,
  Lock,
  Shield,
  HelpCircle,
  Info,
  ChevronRight,
  Check,
  X,
  Search,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CloseFriend {
  id: string;
  friend: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

const SettingsPage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [closeFriendsOpen, setCloseFriendsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');

  const { data: settings } = useQuery({
    queryKey: ['user-settings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: closeFriends = [] } = useQuery({
    queryKey: ['close-friends', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('close_friends')
        .select(`
          id,
          friend:profiles!close_friends_friend_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', profile.id);
      return (data || []) as CloseFriend[];
    },
    enabled: !!profile?.id,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['my-followers', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from('follows')
        .select(`
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('following_id', profile.id);
      return data || [];
    },
    enabled: !!profile?.id && closeFriendsOpen,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      if (!profile?.id) return;
      await supabase
        .from('user_settings')
        .update(updates)
        .eq('profile_id', profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: 'Settings updated' });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          bio,
          avatar_url: avatarUrl || null,
        })
        .eq('id', profile.id);
    },
    onSuccess: () => {
      refreshProfile();
      setEditProfileOpen(false);
      toast({ title: 'Profile updated' });
    },
  });

  const toggleCloseFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!profile?.id) return;
      
      const isCloseFriend = closeFriends.some(cf => cf.friend.id === friendId);
      
      if (isCloseFriend) {
        await supabase
          .from('close_friends')
          .delete()
          .eq('user_id', profile.id)
          .eq('friend_id', friendId);
      } else {
        await supabase
          .from('close_friends')
          .insert({
            user_id: profile.id,
            friend_id: friendId,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['close-friends'] });
    },
  });

  const isCloseFriend = (friendId: string) => 
    closeFriends.some(cf => cf.friend.id === friendId);

  const filteredFollowers = followers.filter(f => 
    f.follower.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.follower.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const settingsGroups = [
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Edit profile',
          onClick: () => {
            setDisplayName(profile?.display_name || '');
            setBio(profile?.bio || '');
            setAvatarUrl(profile?.avatar_url || '');
            setEditProfileOpen(true);
          },
        },
        {
          icon: Users,
          label: 'Close friends',
          subtitle: `${closeFriends.length} people`,
          onClick: () => setCloseFriendsOpen(true),
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: Eye,
          label: 'Show activity status',
          toggle: true,
          checked: settings?.show_active_status ?? true,
          onToggle: (checked: boolean) => 
            updateSettingsMutation.mutate({ show_active_status: checked }),
        },
        {
          icon: Check,
          label: 'Show read receipts',
          toggle: true,
          checked: settings?.show_read_receipts ?? true,
          onToggle: (checked: boolean) => 
            updateSettingsMutation.mutate({ show_read_receipts: checked }),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Dark mode',
          toggle: true,
          checked: theme === 'dark',
          onToggle: (checked: boolean) => setTheme(checked ? 'dark' : 'light'),
        },
      ],
    },
    {
      title: 'More',
      items: [
        { icon: Bell, label: 'Notifications' },
        { icon: Lock, label: 'Privacy and security' },
        { icon: Shield, label: 'Supervision' },
        { icon: HelpCircle, label: 'Help' },
        { icon: Info, label: 'About' },
      ],
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        {settingsGroups.map((group, groupIdx) => (
          <div key={group.title} className={cn(groupIdx > 0 && 'mt-8')}>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
              {group.title}
            </h2>
            <div className="bg-card rounded-xl overflow-hidden">
              {group.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  {idx > 0 && <Separator />}
                  {item.toggle ? (
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <span>{item.label}</span>
                      </div>
                      <Switch
                        checked={item.checked}
                        onCheckedChange={item.onToggle}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={item.onClick}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <p>{item.label}</p>
                          {item.subtitle && (
                            <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}

        {/* Edit Profile Dialog */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Profile photo URL</Label>
                <Input
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-secondary border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="bg-secondary border-0"
                />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-secondary border-0 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  maxLength={150}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
              </div>
              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Close Friends Dialog */}
        <Dialog open={closeFriendsOpen} onOpenChange={setCloseFriendsOpen}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle>Close Friends</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Only close friends can see your close friends stories and notes.
            </p>
            
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search followers..."
                className="pl-9 bg-secondary border-0"
              />
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin mt-4">
              {filteredFollowers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  {searchQuery ? 'No followers found' : 'No followers yet'}
                </p>
              ) : (
                filteredFollowers.map(f => (
                  <button
                    key={f.follower.id}
                    onClick={() => toggleCloseFriendMutation.mutate(f.follower.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors rounded-lg"
                  >
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {f.follower.avatar_url ? (
                        <img 
                          src={f.follower.avatar_url}
                          alt={f.follower.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{f.follower.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{f.follower.username}</p>
                    </div>
                    <div className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                      isCloseFriend(f.follower.id) 
                        ? 'bg-close-friends' 
                        : 'bg-secondary'
                    )}>
                      {isCloseFriend(f.follower.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
