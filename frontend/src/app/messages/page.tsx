'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Send, MessageSquare, Search, Plus, Smile, Paperclip, Check, CheckCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function Avatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm';
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700', 'bg-cyan-100 text-cyan-700', 'bg-green-100 text-green-700', 'bg-orange-100 text-orange-700'];
  const colorIdx = name ? name.charCodeAt(0) % colors.length : 0;
  return (
    <div className={`${s} ${colors[colorIdx]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [reactingTo, setReactingTo] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.get('/messages/conversations').then(r => r.data.data),
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedConv],
    queryFn: () => api.get(`/api/v1/messages/conversations/${selectedConv}/messages`).then(r => r.data.data),
    enabled: !!selectedConv,
    refetchInterval: 3000,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post('/messages/send', { conversationId: selectedConv, content }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedConv] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const filteredConvs = (conversations as any[]).filter((c: any) => {
    if (!search) return true;
    const other = c.participants?.find((p: any) => p.userId !== user?.id);
    return other?.user?.name?.toLowerCase().includes(search.toLowerCase());
  });

  const selectedConvData = (conversations as any[]).find((c: any) => c.id === selectedConv);
  const otherParticipant = selectedConvData?.participants?.find((p: any) => p.userId !== user?.id);

  // Group messages by date
  const groupedMessages = (messages as any[]).reduce((groups: Record<string, any[]>, msg: any) => {
    const date = new Date(msg.createdAt).toLocaleDateString('en', { dateStyle: 'medium' });
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <DashboardLayout title="Messages">
      <div className="flex h-[calc(100vh-8rem)] gap-0 bg-white rounded-2xl border overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="w-72 flex flex-col border-r flex-shrink-0">
          {/* Sidebar header */}
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Messages</h2>
              <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors" title="New conversation">
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-100 rounded-lg border-0 outline-none focus:ring-2 focus:ring-primary-200 placeholder:text-gray-400" />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                <MessageSquare className="w-8 h-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">{search ? 'No matches' : 'No conversations yet'}</p>
              </div>
            ) : filteredConvs.map((conv: any) => {
              const other = conv.participants?.find((p: any) => p.userId !== user?.id);
              const lastMsg = conv.messages?.[0];
              const isSelected = selectedConv === conv.id;
              const unread = conv.unreadCount || 0;
              return (
                <button key={conv.id} onClick={() => setSelectedConv(conv.id)}
                  className={`w-full text-left px-4 py-3 transition-colors border-b last:border-0 ${isSelected ? 'bg-primary-50 border-l-2 border-l-primary-600' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={other?.user?.name} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-sm truncate ${isSelected ? 'font-semibold text-primary-900' : 'font-medium text-gray-900'}`}>
                          {other?.user?.name || 'Unknown'}
                        </p>
                        {lastMsg && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(lastMsg.createdAt).toLocaleTimeString('en', { timeStyle: 'short' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-gray-400 truncate">{lastMsg?.content || 'No messages yet'}</p>
                        {unread > 0 && (
                          <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-white">
                <div className="relative">
                  <Avatar name={otherParticipant?.user?.name} size="md" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{otherParticipant?.user?.name || 'Conversation'}</p>
                  <p className="text-xs text-green-500">Online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gray-50/40">
                {Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-[11px] text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border">{date}</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>
                    <div className="space-y-1.5">
                      {msgs.map((msg: any, i: number) => {
                        const isMine = msg.senderId === user?.id;
                        const isLast = i === msgs.length - 1 || msgs[i + 1]?.senderId !== msg.senderId;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                            {!isMine && isLast && <Avatar name={otherParticipant?.user?.name} size="sm" />}
                            {!isMine && !isLast && <div className="w-7 flex-shrink-0" />}

                            <div className={`relative max-w-[68%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  isMine
                                    ? 'bg-primary-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 rounded-bl-sm border shadow-sm'
                                }`}
                              >
                                {msg.content}
                              </div>

                              {/* Reactions */}
                              {msg.reactions?.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 mt-1">
                                  {Object.entries(
                                    msg.reactions.reduce((acc: Record<string, number>, r: any) => {
                                      acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
                                    }, {})
                                  ).map(([emoji, count]) => (
                                    <span key={emoji} className="text-[11px] bg-white border rounded-full px-1.5 py-0.5 shadow-sm">
                                      {emoji} {count as number > 1 ? count as number : ''}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Time + status */}
                              <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                                <span className="text-[10px] text-gray-400">
                                  {new Date(msg.createdAt).toLocaleTimeString('en', { timeStyle: 'short' })}
                                </span>
                                {isMine && (
                                  msg.read
                                    ? <CheckCheck className="w-3 h-3 text-primary-400" />
                                    : <Check className="w-3 h-3 text-gray-400" />
                                )}
                              </div>

                              {/* Reaction picker (appears on hover) */}
                              <div className={`absolute ${isMine ? 'right-0 -left-24' : 'left-0'} -top-7 hidden group-hover:flex gap-0.5 bg-white border rounded-xl shadow-md px-2 py-1 z-20`}>
                                {REACTIONS.map(emoji => (
                                  <button key={emoji} className="hover:scale-125 transition-transform text-base">
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t bg-white">
                <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-4 py-2">
                  <button className="text-gray-400 hover:text-gray-600 transition-colors pb-1 flex-shrink-0">
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message… (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    className="flex-1 bg-transparent border-0 outline-none resize-none text-sm placeholder:text-gray-400 max-h-32"
                    style={{ minHeight: '24px' }}
                  />
                  <button className="text-gray-400 hover:text-gray-600 transition-colors pb-1 flex-shrink-0">
                    <Smile className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sendMutation.isPending}
                    className="w-8 h-8 rounded-xl bg-primary-600 disabled:bg-gray-200 flex items-center justify-center transition-colors hover:bg-primary-700 flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-300 text-center mt-1">Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/40">
              <div className="w-20 h-20 rounded-3xl bg-white border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                <MessageSquare className="w-9 h-9 text-gray-200" />
              </div>
              <p className="text-gray-600 font-semibold text-lg">Your messages</p>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">Select a conversation from the left or start a new one</p>
              <button className="btn-primary mt-4 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" /> New Message
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
