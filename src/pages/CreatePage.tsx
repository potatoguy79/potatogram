import React, { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Camera, Image, FileText, Music, Users } from 'lucide-react';
import CreateStoryDialog from '@/components/stories/CreateStoryDialog';

const CreatePage: React.FC = () => {
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);

  const createOptions = [
    {
      icon: Camera,
      title: 'Story',
      description: 'Share a photo or video that disappears after 24 hours',
      action: () => setStoryDialogOpen(true),
      available: true,
    },
    {
      icon: FileText,
      title: 'Note',
      description: 'Share a quick thought with your followers',
      action: () => {},
      available: true,
      note: 'Create notes from the messages page',
    },
    {
      icon: Image,
      title: 'Post',
      description: 'Share a photo or video to your profile',
      action: () => {},
      available: false,
      comingSoon: true,
    },
    {
      icon: Users,
      title: 'Broadcast Channel',
      description: 'Create a channel to share updates with followers',
      action: () => {},
      available: false,
      comingSoon: true,
    },
  ];

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-semibold mb-6">Create</h1>

        <div className="space-y-3">
          {createOptions.map((option, idx) => (
            <button
              key={idx}
              onClick={option.available ? option.action : undefined}
              disabled={!option.available}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-colors text-left ${
                option.available 
                  ? 'bg-card hover:bg-accent' 
                  : 'bg-card/50 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                option.available ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                <option.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{option.title}</p>
                  {option.comingSoon && (
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
                {option.note && (
                  <p className="text-xs text-primary mt-1">{option.note}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        <CreateStoryDialog open={storyDialogOpen} onOpenChange={setStoryDialogOpen} />
      </div>
    </MainLayout>
  );
};

export default CreatePage;
