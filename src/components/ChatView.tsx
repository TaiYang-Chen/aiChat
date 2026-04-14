import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User as UserIcon, Settings, Play, Pause, Menu } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Markdown from 'react-markdown';
import { MembersPanel } from './MembersPanel';
import { getChats, saveChats, getMessages, saveMessages, getMembers } from '../lib/localStore';
import { useSidebar } from '../lib/SidebarContext';

const MENTION_OPTIONS = [
  { id: 'image', label: '图片', desc: '生成图像' },
  { id: 'video', label: '视频', desc: '生成视频分镜脚本' },
  { id: 'code', label: '编程', desc: '编写代码' },
  { id: 'icon', label: '图标', desc: '生成图标设计' },
  { id: 'logo', label: 'logo', desc: '生成Logo设计' },
  { id: 'appui', label: 'app界面', desc: '生成App UI设计图' },
  { id: 'music', label: '音乐', desc: '生成歌词或乐谱' },
];

export function ChatView({ user }: { user: any }) {
  const { chatId } = useParams();
  const { setIsOpen } = useSidebar();
  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [isAutoChatting, setIsAutoChatting] = useState(false);
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    filter: '',
    activeIndex: 0,
    cursorPosition: 0
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isGeneratingRef = useRef(false);
  const isAutoChattingRef = useRef(isAutoChatting);
  const manualLoopIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    isAutoChattingRef.current = isAutoChatting;
  }, [isAutoChatting]);

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

  const generateForAI = async (ai: any) => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

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

    let latestMessages = getMessages(chatId!);
    saveMessages(chatId!, [...latestMessages, aiMessage]);

    const contextMessages = latestMessages.slice(-15).map((m: any) => `${m.senderName}: ${m.content}`).join('\n');
    
    let systemAddon = '';
    const lastUserMsg = latestMessages.slice().reverse().find((m: any) => m.senderType === 'user');
    if (lastUserMsg) {
      const content = lastUserMsg.content;
      if (content.includes('@图片')) {
        systemAddon += '\n用户请求生成图片。请使用Markdown格式返回图片，格式为：`![描述](https://image.pollinations.ai/prompt/英文提示词?width=800&height=600&nologo=true)`。请将"英文提示词"替换为具体的英文画面描述，词与词之间用%20连接。';
      }
      if (content.includes('@图标')) {
        systemAddon += '\n用户请求生成图标。请使用Markdown格式返回图片，格式为：`![描述](https://image.pollinations.ai/prompt/flat%20vector%20app%20icon%20design%20of%20英文提示词?width=512&height=512&nologo=true)`。';
      }
      if (content.includes('@logo')) {
        systemAddon += '\n用户请求生成logo。请使用Markdown格式返回图片，格式为：`![描述](https://image.pollinations.ai/prompt/minimalist%20vector%20logo%20design%20of%20英文提示词?width=512&height=512&nologo=true)`。';
      }
      if (content.includes('@app界面')) {
        systemAddon += '\n用户请求生成app界面。请使用Markdown格式返回图片，格式为：`![描述](https://image.pollinations.ai/prompt/mobile%20app%20ui%20design%20of%20英文提示词?width=414&height=896&nologo=true)`。';
      }
      if (content.includes('@编程')) {
        systemAddon += '\n用户请求编程。请直接输出高质量、带有详细注释的代码块。';
      }
      if (content.includes('@视频')) {
        systemAddon += '\n用户请求生成视频。由于你无法直接生成视频文件，请为用户提供一个详细的视频分镜脚本（Storyboard），包括画面描述、镜头运动、旁白和音效提示。';
      }
      if (content.includes('@音乐')) {
        systemAddon += '\n用户请求生成音乐。由于你无法直接生成音频文件，请为用户提供一首歌的歌词、曲风描述，或者使用简谱/和弦来表示一段旋律。';
      }
    }

    const prompt = `聊天记录:\n${contextMessages}\n\n你是 ${ai.name}。请根据上面的聊天记录自然地继续对话，回应其他成员。保持回答简短、口语化，像真实的群聊一样。\n注意：直接输出你的回复内容，不要在开头加上你的名字。${systemAddon}`;

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

      latestMessages = getMessages(chatId!);
      const msgIndex = latestMessages.findIndex((m: any) => m.id === aiMessageId);
      if (msgIndex > -1) {
        latestMessages[msgIndex].content = data.text;
        latestMessages[msgIndex].status = 'sent';
        saveMessages(chatId!, latestMessages);
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      latestMessages = getMessages(chatId!);
      const msgIndex = latestMessages.findIndex((m: any) => m.id === aiMessageId);
      if (msgIndex > -1) {
        latestMessages[msgIndex].content = `[Error: ${err.message}]`;
        latestMessages[msgIndex].status = 'error';
        saveMessages(chatId!, latestMessages);
      }
    } finally {
      isGeneratingRef.current = false;
    }
  };

  // Auto-chat loop
  useEffect(() => {
    if (!isAutoChatting) return;
    if (isGeneratingRef.current) return;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.status === 'generating') return;

    const aiMembers = members.filter(m => m.memberType === 'ai');
    if (aiMembers.length === 0) return;

    let nextAiIndex = 0;
    if (lastMsg.senderType === 'ai') {
      const currentAiIndex = aiMembers.findIndex(m => m.memberId === lastMsg.senderId);
      if (currentAiIndex !== -1) {
        nextAiIndex = (currentAiIndex + 1) % aiMembers.length;
      }
    }

    const nextAi = aiMembers[nextAiIndex];
    
    const timer = setTimeout(() => {
      generateForAI(nextAi);
    }, 2000); // 2 second delay for natural pacing

    return () => clearTimeout(timer);
  }, [messages, isAutoChatting, members]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([^@\s]*)$/);

    if (match) {
      setMentionState({
        isOpen: true,
        filter: match[1],
        activeIndex: 0,
        cursorPosition: cursor - match[1].length - 1
      });
    } else {
      setMentionState(prev => ({ ...prev, isOpen: false }));
    }
  };

  const insertMention = (label: string) => {
    const before = input.slice(0, mentionState.cursorPosition);
    const after = input.slice(mentionState.cursorPosition + mentionState.filter.length + 1);
    const newVal = `${before}@${label} ${after}`;
    setInput(newVal);
    setMentionState({ isOpen: false, filter: '', activeIndex: 0, cursorPosition: 0 });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.isOpen) {
      const filteredOptions = MENTION_OPTIONS.filter(opt => opt.label.toLowerCase().includes(mentionState.filter.toLowerCase()));

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, activeIndex: (prev.activeIndex + 1) % filteredOptions.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState(prev => ({ ...prev, activeIndex: (prev.activeIndex - 1 + filteredOptions.length) % filteredOptions.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredOptions.length > 0) {
          insertMention(filteredOptions[mentionState.activeIndex].label);
        }
        return;
      }
      if (e.key === 'Escape') {
        setMentionState(prev => ({ ...prev, isOpen: false }));
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatId) return;

    const messageText = input.trim();
    setInput('');
    setMentionState(prev => ({ ...prev, isOpen: false }));

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

    if (!isAutoChatting) {
      const aiMembers = members.filter(m => m.memberType === 'ai');
      if (aiMembers.length > 0) {
        const currentLoopId = ++manualLoopIdRef.current;
        (async () => {
          for (const ai of aiMembers) {
            if (isAutoChattingRef.current || manualLoopIdRef.current !== currentLoopId) break;
            
            while (isGeneratingRef.current) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            if (isAutoChattingRef.current || manualLoopIdRef.current !== currentLoopId) break;
            
            await generateForAI(ai);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        })();
      }
    }
  };

  if (!chat) return <div className="flex-1 flex items-center justify-center">加载中...</div>;

  const filteredMentions = MENTION_OPTIONS.filter(opt => opt.label.toLowerCase().includes(mentionState.filter.toLowerCase()));

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setIsOpen(true)} className="md:hidden p-2 -ml-2 text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{chat.name}</h2>
              <p className="text-sm text-gray-500 truncate">{members.length} 名成员</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button
              onClick={() => setIsAutoChatting(!isAutoChatting)}
              className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                isAutoChatting 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isAutoChatting ? (
                <><Pause className="w-4 h-4" /> <span className="hidden sm:inline">暂停讨论</span></>
              ) : (
                <><Play className="w-4 h-4" /> <span className="hidden sm:inline">开启自动讨论</span></>
              )}
            </button>
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-lg transition-colors ${showMembers ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
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
                      <div className="whitespace-pre-wrap break-words prose prose-sm max-w-none">
                        {isAi ? (
                          <Markdown>{msg.content}</Markdown>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0 relative">
          {mentionState.isOpen && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-4 mb-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500">
                选择要生成的内容类型
              </div>
              <ul className="max-h-48 overflow-y-auto py-1">
                {filteredMentions.map((opt, idx) => (
                  <li
                    key={opt.id}
                    onClick={() => insertMention(opt.label)}
                    className={`px-4 py-2 cursor-pointer flex flex-col ${idx === mentionState.activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    onMouseEnter={() => setMentionState(prev => ({ ...prev, activeIndex: idx }))}
                  >
                    <span className="text-sm font-medium text-gray-900">@{opt.label}</span>
                    <span className="text-xs text-gray-500">{opt.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，或输入 @ 唤起特殊生成指令..."
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
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setShowMembers(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 lg:relative lg:z-auto">
            <MembersPanel chatId={chatId} members={members} chat={chat} onClose={() => setShowMembers(false)} />
          </div>
        </>
      )}
    </div>
  );
}
