import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import ConversationList from '@/components/chat/ConversationList';
import ChatArea from '@/components/chat/ChatArea';
import EmptyChat from '@/components/chat/EmptyChat';
import NewConversationDialog from '@/components/chat/NewConversationDialog';
import StoriesBar from '@/components/stories/StoriesBar';
import NotesBar from '@/components/chat/NotesBar';

interface Participant {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
}

const MessagesPage: React.FC = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Update last_seen every minute when user is active
  useEffect(() => {
    if (!profile?.id) return;

    const updateLastSeen = async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', profile.id);
    };

    // Update immediately
    updateLastSeen();

    // Then update every minute
    const interval = setInterval(updateLastSeen, 60000);

    return () => clearInterval(interval);
  }, [profile?.id]);

  const handleSelectConversation = (id: string, participant: Participant) => {
    setSelectedParticipant(participant);
    navigate(`/messages/${id}`);
  };

  const handleConversationCreated = (id: string, participant: any) => {
    setSelectedParticipant({
      ...participant,
      last_seen: new Date().toISOString(),
    });
    navigate(`/messages/${id}`);
  };

  return (
    <MainLayout>
      <div className="flex h-screen overflow-hidden">
        <div className="w-80 flex flex-col border-r border-border bg-card h-full overflow-hidden">
          <StoriesBar />
          <NotesBar />
          <ConversationList
            selectedId={conversationId || null}
            onSelect={handleSelectConversation}
            onNewConversation={() => setNewConversationOpen(true)}
          />
        </div>
        
        {conversationId && selectedParticipant ? (
          <ChatArea
            conversationId={conversationId}
            participant={selectedParticipant}
          />
        ) : (
          <EmptyChat onNewMessage={() => setNewConversationOpen(true)} />
        )}

        <NewConversationDialog
          open={newConversationOpen}
          onOpenChange={setNewConversationOpen}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </MainLayout>
  );
};

export default MessagesPage;
