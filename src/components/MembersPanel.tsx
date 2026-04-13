import { useState } from 'react';
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Bot, User as UserIcon, Plus, X, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { v4 as uuidv4 } from 'uuid';

const PROVIDERS = {
  google: {
    name: 'Google Gemini',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash']
  },
  openai: {
    name: 'OpenAI',
    models: ['gpt-5.4', 'gpt-4o', 'gpt-4-turbo']
  },
  custom: {
    name: '自定义 (OpenAI 兼容)',
    models: []
  }
};

export function MembersPanel({ chatId, members, chat }: { chatId: string, members: any[], chat: any }) {
  const [showAddAI, setShowAddAI] = useState(false);
  const [aiName, setAiName] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-5.4');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const handleAddAI = async () => {
    if (!aiName || !aiPrompt || !aiModel) return;
    try {
      await addDoc(collection(db, `chats/${chatId}/members`), {
        id: uuidv4(),
        chatId,
        memberId: `ai-${uuidv4()}`,
        memberType: 'ai',
        role: 'member',
        aiProvider,
        aiModel,
        aiBaseUrl,
        aiApiKey,
        aiPrompt,
        name: aiName,
        joinedAt: serverTimestamp()
      });
      setShowAddAI(false);
      setAiName('');
      setAiPrompt('');
      setAiBaseUrl('');
      setAiApiKey('');
    } catch (error) {
      console.error("Error adding AI:", error);
    }
  };

  const handleRemoveMember = async (memberDocId: string) => {
    try {
      await deleteDoc(doc(db, `chats/${chatId}/members`, memberDocId));
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">群聊详情</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">成员 ({members.length})</h4>
          <div className="space-y-3">
            {members.map(member => (
              <div key={member._id} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    member.memberType === 'ai' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {member.memberType === 'ai' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    <div className="text-xs text-gray-500 capitalize">
                      {member.memberType === 'ai' ? `${member.aiProvider === 'custom' ? '自定义' : member.aiProvider || 'AI'} • ${member.aiModel || '默认'}` : '用户'}
                    </div>
                  </div>
                </div>
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleRemoveMember(member._id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          {!showAddAI ? (
            <button
              onClick={() => setShowAddAI(true)}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-600 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              添加第三方 AI
            </button>
          ) : (
            <div className="space-y-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">配置 AI 角色</h4>
                <button onClick={() => setShowAddAI(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">名称</label>
                <input type="text" value={aiName} onChange={e => setAiName(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5" placeholder="例如：数据分析师" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">提供商</label>
                <select value={aiProvider} onChange={e => { 
                  const newProvider = e.target.value as keyof typeof PROVIDERS;
                  setAiProvider(newProvider); 
                  if (newProvider !== 'custom') {
                    setAiModel(PROVIDERS[newProvider].models[0]); 
                  } else {
                    setAiModel('gpt-5.4');
                  }
                }} className="w-full text-sm border border-gray-300 rounded-md p-1.5">
                  {Object.entries(PROVIDERS).map(([key, val]) => (
                    <option key={key} value={key}>{val.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">模型</label>
                {aiProvider === 'custom' ? (
                  <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5" placeholder="例如：gpt-5.4" />
                ) : (
                  <select value={aiModel} onChange={e => setAiModel(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5">
                    {PROVIDERS[aiProvider as keyof typeof PROVIDERS].models.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
              </div>

              {aiProvider === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Base URL (可选)</label>
                    <input type="text" value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5" placeholder="例如：http://127.0.0.1:8317/v1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">API Key (可选)</label>
                    <input type="password" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5" placeholder="sk-..." />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">系统提示词 (Prompt)</label>
                <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full text-sm border border-gray-300 rounded-md p-1.5 h-20 resize-none" placeholder="描述该 AI 的角色和行为..." />
              </div>
              
              <button onClick={handleAddAI} disabled={!aiName || !aiPrompt || !aiModel} className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
                确认添加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
