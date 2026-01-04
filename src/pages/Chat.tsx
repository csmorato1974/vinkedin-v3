import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Message, Profile } from '@/types';

interface ConversationWithProfile {
  id: string;
  other_user: Profile;
  last_message?: Message;
  updated_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithProfile[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
      subscribeToMessages(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const conversationIds = participations.map((p) => p.conversation_id);

    // Get other participants
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        user:profiles(*)
      `)
      .in('conversation_id', conversationIds)
      .neq('user_id', user.id);

    // Get conversations with last message
    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (convos && allParticipants) {
      const mapped: ConversationWithProfile[] = convos.map((c) => {
        const participant = allParticipants.find((p) => p.conversation_id === c.id);
        return {
          id: c.id,
          other_user: participant?.user as Profile,
          updated_at: c.updated_at,
        };
      }).filter((c) => c.other_user);

      setConversations(mapped);
    }

    setLoading(false);
  };

  const fetchMessages = async (conversationId: string) => {
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data.map((m) => ({
        ...m,
        sender: m.sender as Profile,
      })));
    }
  };

  const subscribeToMessages = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.sender_id)
            .single();

          const newMsg: Message = {
            ...payload.new as Message,
            sender: senderData as Profile,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversation,
      sender_id: user.id,
      text: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation);
    }

    setSendingMessage(false);
  };

  const selectedConvo = conversations.find((c) => c.id === selectedConversation);

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-4rem)] md:h-screen">
        {/* Conversation list */}
        <div
          className={cn(
            'w-full border-r border-border md:w-80',
            selectedConversation && 'hidden md:block'
          )}
        >
          <div className="border-b border-border p-4">
            <h1 className="text-xl font-bold">Mensajes</h1>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No tienes conversaciones aún
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo.id)}
                  className={cn(
                    'flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted',
                    selectedConversation === convo.id && 'bg-accent'
                  )}
                >
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gradient-brand">
                    {convo.other_user.avatar_url ? (
                      <img
                        src={convo.other_user.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-bold text-white">
                        {convo.other_user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{convo.other_user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(convo.updated_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages view */}
        <div
          className={cn(
            'flex flex-1 flex-col',
            !selectedConversation && 'hidden md:flex'
          )}
        >
          {selectedConvo ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-border p-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-10 w-10 overflow-hidden rounded-full bg-gradient-brand">
                  {selectedConvo.other_user.avatar_url ? (
                    <img
                      src={selectedConvo.other_user.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-bold text-white">
                      {selectedConvo.other_user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium">{selectedConvo.other_user.name}</p>
                  {selectedConvo.other_user.role && (
                    <p className="text-xs text-muted-foreground">
                      {selectedConvo.other_user.role}
                    </p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      message.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-4 py-2',
                        message.sender_id === user?.id
                          ? 'bg-gradient-brand text-white'
                          : 'bg-muted'
                      )}
                    >
                      <p>{message.text}</p>
                      <p
                        className={cn(
                          'mt-1 text-[10px]',
                          message.sender_id === user?.id
                            ? 'text-white/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div className="border-t border-border p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="bg-gradient-brand text-white"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Selecciona una conversación
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
