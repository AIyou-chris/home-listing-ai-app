import React from 'react'

import { useAdminAIContent, type SourceScope } from '../hooks/use-admin-ai-content'

const scopes: SourceScope[] = ['agent', 'listing', 'marketing']

const AIContentPage: React.FC = () => {
  const {
    tab,
    setTab,
    scope,
    setScope,
    message,
    setMessage,
    reply,
    loading,
    history,
    send,
    handleNewConversation,
    handleSelectConversation,
    conversationsList,
    conversationId,
    exportConversations,
    convSearch,
    setConvSearch,
    convDrawer,
    setConvDrawer
  } = useAdminAIContent()

  return (
    <div className='bg-slate-50 min-h-full'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6'>
        {/* Header */}
        <div className='mb-5 flex items-center justify-between'>
          <div>
            <h1 className='text-[22px] font-semibold tracking-[-0.01em] text-slate-900'>AI Content Management</h1>
            <p className='text-slate-500 text-sm'>Leverage AI to enhance your real estate business.</p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={async () => {
                try {
                  await exportConversations()
                } catch (error) {
                  console.error('Export failed:', error)
                }
              }}
              className='inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            >
              <span className='material-symbols-outlined text-base'>download</span>
              Export CSV
            </button>
            <button
              onClick={() => setConvDrawer(true)}
              className='lg:hidden inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            >
              <span className='material-symbols-outlined text-base'>forum</span>
              Conversations
            </button>
            <span className='text-xs text-slate-500'>Knowledge</span>
            <div className='inline-flex rounded-full border border-slate-200 bg-white shadow-sm overflow-hidden'>
              {scopes.map(option => (
                <button
                  key={option}
                  onClick={() => setScope(option)}
                  className={`px-3 py-1.5 text-xs font-medium ${scope === option ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-4'>
          {[
            { label: 'Conversations', value: '24', icon: 'forum', color: 'blue-600' },
            { label: 'Blogs Created', value: '8', icon: 'draft', color: 'purple-600' },
            { label: 'AI Responses', value: '156', icon: 'bolt', color: 'emerald-600' },
            { label: 'Efficiency', value: '+45%', icon: 'trending_up', color: 'orange-600' }
          ].map(kpi => (
            <div key={kpi.label} className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3'>
              <span className={`material-symbols-outlined text-${kpi.color}`}>{kpi.icon}</span>
              <div>
                <div className='text-xs text-slate-500'>{kpi.label}</div>
                <div className='text-lg font-semibold text-slate-900'>{kpi.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className='mb-4 border-b border-slate-200'>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => setTab('chat')}
              className={`px-3 py-2 text-sm font-medium inline-flex items-center gap-2 rounded-t-lg border-b-2 ${
                tab === 'chat'
                  ? 'text-blue-700 bg-blue-50 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <span className='material-symbols-outlined text-base'>chat</span>
              Conversations
            </button>
            <button
              onClick={() => setTab('history')}
              className={`px-3 py-2 text-sm font-medium inline-flex items-center gap-2 rounded-t-lg border-b-2 ${
                tab === 'history'
                  ? 'text-blue-700 bg-blue-50 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700 border-transparent'
              }`}
            >
              <span className='material-symbols-outlined text-base'>visibility</span>
              History
            </button>
          </div>
        </div>

        {tab === 'chat' && (
          <div className='flex gap-5'>
            {/* Sidebar */}
            <aside className='hidden lg:block w-72 flex-shrink-0'>
              <div className='rounded-2xl border border-slate-200 bg-white shadow-sm p-3'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-sm font-semibold text-slate-900'>Conversations</div>
                  <button onClick={handleNewConversation} className='text-xs px-2 py-1 rounded-md bg-slate-900 text-white'>New</button>
                </div>
                <input
                  value={convSearch}
                  onChange={event => setConvSearch(event.target.value)}
                  placeholder='Search…'
                  className='w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs mb-2'
                />
                <div className='max-h-[460px] overflow-y-auto -mx-1 pr-1'>
                  {conversationsList
                    .filter(c => (c.title || 'Untitled').toLowerCase().includes(convSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectConversation(c.id)}
                        className={`w-full text-left px-2 py-2 rounded-md text-sm mb-1 ${conversationId === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}
                      >
                        <div className='truncate'>{c.title || 'Untitled'}</div>
                      </button>
                    ))}
                </div>
              </div>
            </aside>

            {/* Chat full width */}
            <div className='flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-[520px]'>
              <div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
                <div className='text-sm font-semibold text-slate-900'>Assistant</div>
              </div>
              <div className='flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50'>
                {history.length === 0 && <div className='text-sm text-slate-500'>Start a conversation with your AI assistant…</div>}
                {history.map((m, index) => (
                  <div key={index} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                        m.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-800'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && <div className='text-sm text-slate-500'>Thinking…</div>}
                {reply && !loading && (
                  <div className='flex justify-start'>
                    <div className='max-w-[80%] px-3 py-2 rounded-xl text-sm bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap'>
                      {reply}
                    </div>
                  </div>
                )}
              </div>
              <div className='px-3 py-3 border-t border-slate-200 bg-white'>
                <div className='flex items-center gap-2'>
                  <input
                    value={message}
                    onChange={event => setMessage(event.target.value)}
                    placeholder='Ask me anything about real estate…'
                    className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm'
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading}
                    className='px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1'
                  >
                    <span className='material-symbols-outlined text-base'>send</span>
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className='text-sm text-slate-600'>Conversation history will appear here.</div>
        )}
      </div>

      {/* Conversations Drawer (mobile) */}
      {convDrawer && (
        <div className='fixed inset-0 z-50 lg:hidden'>
          <div className='absolute inset-0 bg-black/30' onClick={() => setConvDrawer(false)} />
          <div className='absolute left-0 top-0 h-full w-full max-w-sm bg-white border-r border-slate-200 shadow-2xl flex flex-col'>
            <div className='px-4 py-3 border-b border-slate-200 flex items-center justify-between'>
              <div className='text-sm font-semibold text-slate-900'>Conversations</div>
              <button className='p-1 rounded-md hover:bg-slate-100' onClick={() => setConvDrawer(false)}>
                <span className='material-symbols-outlined'>close</span>
              </button>
            </div>
            <div className='p-3 border-b border-slate-200 flex items-center gap-2'>
              <input
                value={convSearch}
                onChange={event => setConvSearch(event.target.value)}
                placeholder='Search…'
                className='flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm'
              />
              <button onClick={handleNewConversation} className='text-xs px-2 py-1 rounded-md bg-slate-900 text-white'>New</button>
            </div>
            <div className='p-3 space-y-1 overflow-y-auto'>
              {conversationsList
                .filter(c => (c.title || 'Untitled').toLowerCase().includes(convSearch.toLowerCase()))
                .map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      handleSelectConversation(c.id)
                      setConvDrawer(false)
                    }}
                    className={`w-full text-left px-2 py-2 rounded-md text-sm ${
                      conversationId === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className='truncate'>{c.title || 'Untitled'}</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIContentPage
