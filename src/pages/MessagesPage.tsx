import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ConversationList from '@/components/chat/ConversationList';
import ChatArea from '@/components/chat/ChatArea';
import EmptyChat from '@/components/chat/EmptyChat';
import NewConversationDialog from '@/components/chat/NewConversationDialog';

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
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

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
      <div className="flex h-screen">
        <ConversationList
          selectedId={conversationId || null}
          onSelect={handleSelectConversation}
          onNewConversation={() => setNewConversationOpen(true)}
        />
        
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
