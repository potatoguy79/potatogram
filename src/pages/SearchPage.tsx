import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { User, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
}

const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, last_seen')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data as SearchResult[];
    },
    enabled: query.trim().length > 0,
  });

  const isOnline = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">Search</h1>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10 bg-secondary border-0 h-12 text-base"
          />
        </div>

        <div className="space-y-1">
          {query.trim() === '' ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Search for people by username or name</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse-soft">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users found for "{query}"
            </div>
          ) : (
            results.map(user => (
              <button
                key={user.id}
                onClick={() => navigate(`/profile/${user.username}`)}
                className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img 
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  {isOnline(user.last_seen) && (
                    <div className="absolute bottom-0 right-0 online-indicator" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{user.username}</p>
                </div>
                <span className={cn(
                  'text-xs',
                  isOnline(user.last_seen) ? 'text-active' : 'text-muted-foreground'
                )}>
                  {isOnline(user.last_seen) 
                    ? 'Active now' 
                    : formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })
                  }
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default SearchPage;
