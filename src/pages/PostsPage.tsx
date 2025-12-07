import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Grid3X3, Sparkles } from 'lucide-react';

const PostsPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Grid3X3 className="w-12 h-12 text-primary" />
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary animate-pulse-soft" />
            <h1 className="text-3xl font-light">Posts coming soon!</h1>
            <Sparkles className="w-5 h-5 text-primary animate-pulse-soft" />
          </div>
          
          <p className="text-muted-foreground text-lg mb-8">
            Stay tuned for the ability to share photos and videos with your followers.
          </p>

          <div className="grid grid-cols-3 gap-1 opacity-30">
            {Array.from({ length: 9 }).map((_, i) => (
              <div 
                key={i} 
                className="aspect-square bg-muted rounded-sm"
                style={{
                  animationDelay: `${i * 100}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default PostsPage;
