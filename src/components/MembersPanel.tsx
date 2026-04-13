import { useState } from 'react';
import { Bot, User as UserIcon, Plus, X, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { getMembers, saveMembers } from '../lib/localStore';

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

const PREDEFINED_ROLES = [
  { name: '自定义角色', prompt: '' },
  { name: '产品经理 (PM)', prompt: '你是产品经理 (PM)。负责需求收集、市场调研、产品规划，确保开发团队理解并完成业务目标。请从产品和业务的角度参与讨论。' },
  { name: 'UI/UX 设计师', prompt: '你是 UI/UX 设计师。设计产品界面和用户体验，确保产品易用、吸引人。请从用户体验和设计的角度参与讨论。' },
  { name: '架构师', prompt: '你是架构师。负责系统设计和技术架构的决策，确保系统可扩展、可维护、高效。请从系统架构和技术选型的角度参与讨论。' },
  { name: '后端开发工程师', prompt: '你是后端开发工程师。负责服务器端逻辑、数据库设计、API 开发等核心功能的实现。请从后端技术和数据处理的角度参与讨论。' },
  { name: '前端开发工程师', prompt: '你是前端开发工程师。负责用户界面的开发，包括网站、Web 应用程序或移动应用的前端展示。请从前端技术和界面交互的角度参与讨论。' },
  { name: '全栈开发工程师', prompt: '你是全栈开发工程师。同时精通前端和后端技术，能够在全栈环境中进行开发。请从全栈开发的角度参与讨论。' },
  { name: '移动开发工程师', prompt: '你是移动开发工程师。专注于 Android 或 iOS 应用开发。请从移动端开发的角度参与讨论。' },
  { name: 'DevOps 工程师', prompt: '你是 DevOps 工程师。负责自动化部署、持续集成、基础设施管理、监控系统等。请从运维自动化和部署的角度参与讨论。' },
  { name: '测试工程师', prompt: '你是测试工程师。负责撰写测试用例、执行功能测试、性能测试等，确保产品的质量。请从质量保证和测试的角度参与讨论。' },
  { name: '自动化测试工程师', prompt: '你是自动化测试工程师。负责开发自动化测试脚本，提升测试效率。请从自动化测试和质量控制的角度参与讨论。' },
  { name: '运维工程师', prompt: '你是运维工程师。负责系统部署、服务器维护、监控、日志管理等，确保系统运行稳定。请从系统稳定性和运维的角度参与讨论。' },
  { name: '技术支持工程师', prompt: '你是技术支持工程师。为客户提供技术支持，帮助解决产品使用中的问题。请从客户支持和问题排查的角度参与讨论。' },
  { name: '客户服务', prompt: '你是客户服务。处理用户反馈、帮助解决使用中的问题。请从客户服务和用户反馈的角度参与讨论。' },
  { name: '项目管理 (PM)', prompt: '你是项目经理 (PM)。协调项目进度，确保各项工作按时完成，处理团队沟通和项目管理。请从项目管理和进度的角度参与讨论。' },
  { name: '团队领导/技术主管', prompt: '你是团队领导/技术主管。领导开发团队的日常工作，帮助解决技术难题，推动技术发展。请从技术领导和团队管理的角度参与讨论。' },
  { name: '数据分析师', prompt: '你是数据分析师。通过分析数据帮助团队做出业务决策。请从数据分析和业务洞察的角度参与讨论。' },
  { name: '数据科学家', prompt: '你是数据科学家。基于大数据、机器学习等技术，挖掘业务机会和优化产品。请从数据科学和算法的角度参与讨论。' },
  { name: '市场营销人员', prompt: '你是市场营销人员。推广产品，进行品牌宣传和市场活动。请从市场营销和推广的角度参与讨论。' },
  { name: '销售人员', prompt: '你是销售人员。负责客户关系、产品销售等。请从销售和客户关系的角度参与讨论。' },
  { name: '法律顾问', prompt: '你是法律顾问。处理公司合同、知识产权保护、合规等事务。请从法律合规和风险控制的角度参与讨论。' },
  { name: '财务人员', prompt: '你是财务人员。负责公司财务、预算和税务等。请从财务和成本控制的角度参与讨论。' }
];

export function MembersPanel({ chatId, members, chat, onClose }: { chatId: string, members: any[], chat: any, onClose?: () => void }) {
  const [showAddAI, setShowAddAI] = useState(false);
  const [selectedRole, setSelectedRole] = useState('自定义角色');
  const [aiName, setAiName] = useState('');
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-5.4');
  const [aiBaseUrl, setAiBaseUrl] = useState('http://127.0.0.1:8317/v1');
  const [aiApiKey, setAiApiKey] = useState('sk-KEBARebKgMgjKrAdL');
  const [aiPrompt, setAiPrompt] = useState('');

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const roleName = e.target.value;
    setSelectedRole(roleName);
    
    if (roleName === '自定义角色') {
      setAiName('');
      setAiPrompt('');
    } else {
      const role = PREDEFINED_ROLES.find(r => r.name === roleName);
      if (role) {
        setAiName(role.name);
        setAiPrompt(role.prompt);
      }
    }
  };

  const handleAddAI = () => {
    if (!aiName || !aiPrompt || !aiModel) return;
    
    const newMember = {
      _id: uuidv4(),
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
      joinedAt: Date.now()
    };
    
    const currentMembers = getMembers(chatId);
    saveMembers(chatId, [...currentMembers, newMember]);
    
    setShowAddAI(false);
    setAiName('');
    setAiPrompt('');
    // keep defaults for next time
  };

  const handleRemoveMember = (memberDocId: string) => {
    const currentMembers = getMembers(chatId);
    saveMembers(chatId, currentMembers.filter((m: any) => m._id !== memberDocId));
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col shrink-0 h-full">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">群聊详情</h3>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        )}
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
                <label className="block text-xs font-medium text-gray-700 mb-1">预设角色</label>
                <select 
                  value={selectedRole} 
                  onChange={handleRoleChange} 
                  className="w-full text-sm border border-gray-300 rounded-md p-1.5 mb-2 bg-gray-50"
                >
                  {PREDEFINED_ROLES.map(role => (
                    <option key={role.name} value={role.name}>{role.name}</option>
                  ))}
                </select>
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
