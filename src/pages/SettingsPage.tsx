import React, { useState, useRef } from 'react';
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
  Search,
  Camera,
  Loader2,
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
  const { profile, refreshProfile, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [closeFriendsOpen, setCloseFriendsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
            id, username, display_name, avatar_url
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
            id, username, display_name, avatar_url
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
      await supabase.from('user_settings').update(updates).eq('profile_id', profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast({ title: 'Settings updated' });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      await supabase.from('profiles').update({
        display_name: displayName,
        bio,
        avatar_url: avatarUrl || null,
      }).eq('id', profile.id);
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
      const isCloseFriendNow = closeFriends.some(cf => cf.friend.id === friendId);
      if (isCloseFriendNow) {
        await supabase.from('close_friends').delete().eq('user_id', profile.id).eq('friend_id', friendId);
      } else {
        await supabase.from('close_friends').insert({ user_id: profile.id, friend_id: friendId });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['close-friends'] }),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      
      await supabase.storage.from('avatars').remove([fileName]);
      const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCacheBust);
      toast({ title: 'Photo uploaded!' });
    } catch (error) {
      toast({ title: 'Failed to upload', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const isCloseFriend = (friendId: string) => closeFriends.some(cf => cf.friend.id === friendId);

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
          onToggle: (checked: boolean) => updateSettingsMutation.mutate({ show_active_status: checked }),
        },
        {
          icon: Check,
          label: 'Show read receipts',
          toggle: true,
          checked: settings?.show_read_receipts ?? true,
          onToggle: (checked: boolean) => updateSettingsMutation.mutate({ show_read_receipts: checked }),
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
        { icon: Bell, label: 'Notifications', onClick: () => setNotificationsOpen(true) },
        { icon: Lock, label: 'Privacy and security', onClick: () => setPrivacyOpen(true) },
        { icon: Shield, label: 'Supervision', onClick: () => toast({ title: 'Supervision settings coming soon!' }) },
        { icon: HelpCircle, label: 'Help', onClick: () => setHelpOpen(true) },
        { icon: Info, label: 'About', onClick: () => setAboutOpen(true) },
      ],
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        {settingsGroups.map((group, groupIdx) => (
          <div key={group.title} className={cn(groupIdx > 0 && 'mt-8')}>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">{group.title}</h2>
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
                      <Switch checked={item.checked} onCheckedChange={item.onToggle} />
                    </div>
                  ) : (
                    <button onClick={item.onClick} className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5 text-muted-foreground" />
                        <div className="text-left">
                          <p>{item.label}</p>
                          {item.subtitle && <p className="text-sm text-muted-foreground">{item.subtitle}</p>}
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

        {/* Edit Profile Dialog with Image Upload */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex justify-center">
                <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="relative group">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="bg-secondary border-0" />
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="w-full bg-secondary border-0 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary" maxLength={150} />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/150</p>
              </div>
              <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} className="w-full">
                {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Close Friends Dialog */}
        <Dialog open={closeFriendsOpen} onOpenChange={setCloseFriendsOpen}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader><DialogTitle>Close Friends</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Only close friends can see your close friends stories and notes.</p>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search followers..." className="pl-9 bg-secondary border-0" />
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin mt-4">
              {filteredFollowers.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">{searchQuery ? 'No followers found' : 'No followers yet'}</p>
              ) : (
                filteredFollowers.map(f => (
                  <button key={f.follower.id} onClick={() => toggleCloseFriendMutation.mutate(f.follower.id)} className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors rounded-lg">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {f.follower.avatar_url ? <img src={f.follower.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">{f.follower.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{f.follower.username}</p>
                    </div>
                    <div className={cn('w-6 h-6 rounded-full flex items-center justify-center transition-colors', isCloseFriend(f.follower.id) ? 'bg-close-friends' : 'bg-secondary')}>
                      {isCloseFriend(f.follower.id) && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Notifications Settings Dialog */}
        <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Notification Settings</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-muted-foreground text-sm">Control how and when you receive notifications.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2"><span>Push notifications</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between py-2"><span>Email notifications</span><Switch /></div>
                <div className="flex items-center justify-between py-2"><span>Like notifications</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between py-2"><span>Comment notifications</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between py-2"><span>Follow notifications</span><Switch defaultChecked /></div>
                <div className="flex items-center justify-between py-2"><span>Message notifications</span><Switch defaultChecked /></div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Privacy Dialog */}
        <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Privacy and Security</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <p className="text-muted-foreground text-sm">Manage your privacy and security settings.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2"><span>Private account</span><Switch defaultChecked={profile?.is_private} /></div>
                <div className="flex items-center justify-between py-2"><span>Two-factor authentication</span><Switch /></div>
                <div className="flex items-center justify-between py-2"><span>Login activity alerts</span><Switch defaultChecked /></div>
              </div>
              <Button variant="outline" className="w-full">Download your data</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Help Dialog */}
        <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>Help Center</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"><p className="font-medium">Getting Started</p><p className="text-sm text-muted-foreground">Learn the basics</p></button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"><p className="font-medium">Account Issues</p><p className="text-sm text-muted-foreground">Login, security, and more</p></button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"><p className="font-medium">Privacy & Safety</p><p className="text-sm text-muted-foreground">Manage your privacy</p></button>
                <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"><p className="font-medium">Report a Problem</p><p className="text-sm text-muted-foreground">Let us know what went wrong</p></button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* About Dialog */}
        <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
          <DialogContent className="bg-card">
            <DialogHeader><DialogTitle>About PotatoGram</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4 text-center">
              <div className="text-4xl">🥔</div>
              <h3 className="text-xl font-semibold">PotatoGram</h3>
              <p className="text-muted-foreground">Version 2.0</p>
              <p className="text-sm text-muted-foreground">A social media platform for sharing moments with friends. Connect, share stories, and stay in touch with the people who matter most.</p>
              <Separator />
              <div className="text-sm text-muted-foreground space-y-1">
                <p>Created by Potato_guy79</p>
                <p>Last updated: December 7, 2025</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;