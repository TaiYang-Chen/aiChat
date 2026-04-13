import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User as UserIcon, Settings } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { MembersPanel } from './MembersPanel';
import { getChats, saveChats, getMessages, saveMessages, getMembers } from '../lib/localStore';

export function ChatView({ user }: { user: any }) {
  const { chatId } = useParams();
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!chatId) return;
    const allChats = getChats();
    const currentChat = allChats.find((c: any) => c.id === chatId);
    setChat(currentChat || null);
    setMessages(getMessages(chatId));
    setMembers(getMembers(chatId));
  };

  useEffect(() => {
    loadData();
    const handleMessages = (e: any) => { if (e.detail.chatId === chatId) loadData(); };
    const handleMembers = (e: any) => { if (e.detail.chatId === chatId) loadData(); };
    const handleChats = () => loadData();
    
    window.addEventListener('messages_updated', handleMessages);
    window.addEventListener('members_updated', handleMembers);
    window.addEventListener('chats_updated', handleChats);
    
    return () => {
      window.removeEventListener('messages_updated', handleMessages);
      window.removeEventListener('members_updated', handleMembers);
      window.removeEventListener('chats_updated', handleChats);
    };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;

    const messageText = input.trim();
    setInput('');

    const messageId = uuidv4();
    const newMessage = {
      _id: messageId,
      id: messageId,
      chatId,
      senderId: user.uid,
      senderType: 'user',
      senderName: user.displayName || 'User',
      content: messageText,
      createdAt: Date.now(),
      status: 'sent'
    };

    const currentMessages = getMessages(chatId);
    saveMessages(chatId, [...currentMessages, newMessage]);

    const allChats = getChats();
    const chatIndex = allChats.findIndex((c: any) => c.id === chatId);
    if (chatIndex > -1) {
      allChats[chatIndex].updatedAt = Date.now();
      saveChats(allChats);
    }

    // Check if we need to trigger AI responses
    const aiMembers = members.filter(m => m.memberType === 'ai');
    const contextMessages = [...currentMessages, newMessage].slice(-10).map(m => `${m.senderName}: ${m.content}`).join('\n');
    
    await Promise.all(aiMembers.map(async (ai) => {
      // Create a "generating" placeholder message
      const aiMessageId = uuidv4();
      const aiMessage = {
        _id: aiMessageId,
        id: aiMessageId,
        chatId,
        senderId: ai.memberId,
        senderType: 'ai',
        senderName: ai.name,
        content: '',
        createdAt: Date.now(),
        status: 'generating'
      };

      let latestMessages = getMessages(chatId);
      saveMessages(chatId, [...latestMessages, aiMessage]);

      const prompt = `Chat Context:\n${contextMessages}\nUser: ${messageText}\n\nRespond as ${ai.name}.`;
      
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: ai.aiProvider || 'google',
            model: ai.aiModel || 'gemini-2.5-pro',
            prompt: prompt,
            systemInstruction: ai.aiPrompt,
            baseUrl: ai.aiBaseUrl,
            apiKey: ai.aiApiKey
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate');

        // Update the AI message with the actual response
        latestMessages = getMessages(chatId);
        const msgIndex = latestMessages.findIndex((m: any) => m.id === aiMessageId);
        if (msgIndex > -1) {
          latestMessages[msgIndex].content = data.text;
          latestMessages[msgIndex].status = 'sent';
          saveMessages(chatId, latestMessages);
        }
      } catch (err: any) {
        console.error("AI Generation Error:", err);
        latestMessages = getMessages(chatId);
        const msgIndex = latestMessages.findIndex((m: any) => m.id === aiMessageId);
        if (msgIndex > -1) {
          latestMessages[msgIndex].content = `[Error: ${err.message}]`;
          latestMessages[msgIndex].status = 'error';
          saveMessages(chatId, latestMessages);
        }
      }
    }));
  };

  if (!chat) return <div className="flex-1 flex items-center justify-center">加载中...</div>;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{chat.name}</h2>
            <p className="text-sm text-gray-500 truncate">{members.length} 名成员</p>
          </div>
          <button
            onClick={() => setShowMembers(!showMembers)}
            className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const isAi = msg.senderType === 'ai';
            
            return (
              <div key={msg._id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isMe ? 'bg-blue-100 text-blue-600' : isAi ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isAi ? <Bot className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                </div>
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 ml-1">{msg.senderName}</span>
                  <div className={`px-4 py-2 rounded-2xl ${
                    isMe ? 'bg-blue-600 text-white rounded-tr-none' : 
                    isAi ? 'bg-purple-50 text-gray-900 rounded-tl-none border border-purple-100' : 
                    'bg-gray-100 text-gray-900 rounded-tl-none'
                  }`}>
                    {msg.status === 'generating' ? (
                      <div className="flex gap-1 items-center h-6">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="输入消息..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none min-h-[52px] max-h-32"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel */}
      {showMembers && (
        <MembersPanel chatId={chatId} members={members} chat={chat} />
      )}
    </div>
  );
}
