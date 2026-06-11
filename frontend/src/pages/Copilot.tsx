import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Bot, Send, User, Sparkles, Megaphone, Calendar, Clock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logActivity } from '../lib/activity';
import { useAuthStore } from '../store/useAuthStore';

export default function Copilot() {
  const { user } = useAuthStore();
  const [prompt, setPrompt] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery({
    queryKey: ['ai_conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ai_conversations').select('*').eq('user_id', user?.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['ai_messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data, error } = await supabase.from('ai_messages').select('*').eq('conversation_id', activeConversationId).order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!activeConversationId
  });

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await supabase.from('ai_conversations').insert([{ title, user_id: user?.id }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
      setActiveConversationId(data.id);
    }
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      if (activeConversationId === id) setActiveConversationId(null);
      queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
    }
  });

  const sendMessage = useMutation({
    mutationFn: async ({ text, role, data, explicitConvId }: { text: string, role: string, data?: any, explicitConvId?: string }) => {
      let convId = explicitConvId || activeConversationId;
      if (!convId) {
        const { data: conv, error } = await supabase.from('ai_conversations').insert([{ title: text.substring(0, 30) + '...', user_id: user?.id }]).select().single();
        if (error) throw error;
        convId = conv.id;
        setActiveConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ['ai_conversations'] });
      }

      const { error } = await supabase.from('ai_messages').insert([{
        conversation_id: convId,
        role,
        content: text,
        data: data || null
      }]);
      if (error) throw error;
      return { text, role, data, convId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_messages', activeConversationId] });
      scrollToBottom();
    }
  });

  const generateAIResponse = useMutation({
    mutationFn: async (userPrompt: string) => {
      // 1. Save user message
      const userMsgResult = await sendMessage.mutateAsync({ text: userPrompt, role: 'user' });

      // 2. Fetch history for context
      const history = messages.map(m => ({ role: m.role, content: m.content })).slice(-5);

      // 3. Call backend Gemini endpoint
      let rawUrl = import.meta.env.MODE === 'development' ? 'http://localhost:5000' : (import.meta.env.VITE_BACKEND_URL || '');
      if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
        rawUrl = 'https://' + rawUrl;
      }
      const API_URL = rawUrl.replace(/\/$/, '');
      const response = await fetch(`${API_URL}/api/copilot/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userPrompt, history, userId: user?.id })
      });
      
      if (!response.ok) throw new Error('AI Generation failed');
      const data = await response.json();

      // 4. Save AI response
      await sendMessage.mutateAsync({ 
        text: data.textResponse || 'Here is what I found for you.',
        role: 'assistant',
        data,
        explicitConvId: userMsgResult.convId || undefined
      });
    }
  });

  const createCampaign = useMutation({
    mutationFn: async (campaignData: any) => {
      const { data, error } = await supabase.from('campaigns').insert([{
        name: 'AI Generated Campaign',
        message: campaignData.generatedMessage,
        channel: campaignData.recommendedChannel,
        audience_size: campaignData.audienceFound,
        status: 'Draft',
        user_id: user?.id
      }]).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await logActivity('Created AI Campaign', 'Campaign', data.id, { name: data.name, channel: data.channel });
      }
      alert(`Campaign "${data.name}" created and saved as Draft!`);
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, generateAIResponse.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || generateAIResponse.isPending) return;
    
    generateAIResponse.mutate(prompt);
    setPrompt('');
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      
      {/* Sidebar for conversations */}
      <div className="w-64 border-r border-gray-100 bg-gray-50/50 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <Button 
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
            onClick={() => setActiveConversationId(null)}
          >
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((conv) => (
            <div key={conv.id} className={`group flex items-center justify-between w-full px-3 py-2 text-sm rounded-xl transition-colors ${activeConversationId === conv.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
              <button
                onClick={() => setActiveConversationId(conv.id)}
                className="flex-1 text-left truncate"
              >
                {conv.title}
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); deleteConversation.mutate(conv.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeConversationId && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-80">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Bot className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Campaign Copilot</h3>
              <p className="text-gray-500 mb-8">
                I can help you analyze audiences, draft campaigns, and schedule communications. What would you like to do today?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" className="rounded-full text-sm hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50" onClick={() => setPrompt('Find users who haven\'t purchased in 60 days')}>
                  {"\"Find inactive users (>60 days)\""}
                </Button>
                <Button variant="outline" className="rounded-full text-sm hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50" onClick={() => setPrompt('Draft a weekend sale WhatsApp message')}>
                  "Draft weekend sale via WhatsApp"
                </Button>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-indigo-600" />
                </div>
              )}
              
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm' : ''}`}>
                
                {msg.role === 'user' ? (
                  <p className="text-lg font-medium">{msg.content}</p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-lg text-gray-800 bg-gray-50 px-5 py-3 rounded-2xl rounded-tl-sm border border-gray-100">{msg.content}</p>
                    
                    {msg.data && msg.data.highlights && msg.data.highlights.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-2">
                        {msg.data.highlights.map((hl: any, i: number) => {
                          const bgColors: any = {
                            blue: 'bg-blue-50/50 border-blue-100 text-blue-700',
                            green: 'bg-green-50/50 border-green-100 text-green-700',
                            purple: 'bg-purple-50/50 border-purple-100 text-purple-700',
                            orange: 'bg-orange-50/50 border-orange-100 text-orange-700',
                            indigo: 'bg-indigo-50/50 border-indigo-100 text-indigo-700'
                          };
                          const colorClass = bgColors[hl.color] || bgColors.indigo;
                          return (
                            <div key={i} className={`p-4 rounded-xl border ${colorClass} flex flex-col gap-1`}>
                              <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                                <span>{hl.icon}</span> <span>{hl.title}</span>
                              </div>
                              <div className="text-lg font-bold">{hl.value}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {msg.data && msg.data.generatedMessage && (
                      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold flex items-center gap-2 text-indigo-900">
                            <Sparkles className="w-4 h-4 text-indigo-600" /> AI Recommendation
                          </h4>
                          <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-md uppercase tracking-wider">{msg.data.recommendedChannel}</span>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-xl text-gray-700 font-medium border border-gray-100 relative">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                          {msg.data.generatedMessage}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                           <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-50 text-center">
                             <p className="text-xs text-gray-500 mb-1">Target Audience</p>
                             <p className="text-lg font-bold text-indigo-700">{msg.data.audienceFound?.toLocaleString() || 0}</p>
                           </div>
                           <div className="bg-green-50/50 p-3 rounded-xl border border-green-50 text-center">
                             <p className="text-xs text-gray-500 mb-1">Expected Open Rate</p>
                             <p className="text-lg font-bold text-green-700">{msg.data.expectedOpenRate}%</p>
                           </div>
                           <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-50 text-center">
                             <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Expected Revenue</p>
                             <p className="text-lg font-bold text-blue-700">₹{msg.data.expectedRevenue?.toLocaleString() || 0}</p>
                           </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                          <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 shadow-sm"
                            onClick={() => createCampaign.mutate(msg.data)}
                            disabled={createCampaign.isPending}
                          >
                            <Megaphone className="w-4 h-4 mr-2" /> 
                            {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {generateAIResponse.isPending && (
            <div className="flex gap-4 justify-start">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="bg-gray-50 px-5 py-3 rounded-2xl rounded-tl-sm border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-100 bg-white">
          <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-end gap-2 bg-gray-50 rounded-2xl p-2 border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <textarea
              className="w-full bg-transparent p-4 outline-none resize-none max-h-32 text-xl font-medium"
              placeholder="Ask Copilot to analyze data, draft campaigns, or schedule messages..."
              rows={1}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="rounded-xl shrink-0 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              disabled={!prompt.trim() || generateAIResponse.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-center mt-3">
             <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">AI Copilot can make mistakes. Please verify campaigns before sending.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
