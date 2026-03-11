import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Trash2, Search, Download } from 'lucide-react';
import { streamChat, type Msg } from '@/lib/chatStream';
import ReactMarkdown from 'react-markdown';
import { useApp } from '@/contexts/AppContext';

const QUICK_QUESTIONS = [
  "How does URL scanning work?",
  "What do risk scores mean?",
  "How to spot a phishing link?",
];

const DEFAULT_MSG: Msg = { role: 'assistant', content: "👋 Hi! I'm PhishGuard AI Support. How can I help you today?" };

interface ChatBubbleWidgetProps {
  embedded?: boolean;
}

const ChatBubbleWidget: React.FC<ChatBubbleWidgetProps> = ({ embedded = false }) => {
  const { db, session } = useApp();
  const [open, setOpen] = useState(embedded);
  const [messages, setMessages] = useState<Msg[]>([DEFAULT_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDone = useRef(false);

  // Derive a session key for chat persistence
  const sessionKey = session?.userId ? `${session.role}_${session.userId}` : 'guest';

  // Load chat history from local DB on mount
  useEffect(() => {
    if (!db || initialLoadDone.current) return;
    initialLoadDone.current = true;
    try {
      const rows = db.query(
        'SELECT role, content FROM chat_messages WHERE session_key = ? ORDER BY id ASC',
        [sessionKey]
      );
      if (rows.length > 0) {
        setMessages(rows.map((r: any) => ({ role: r.role, content: r.content })));
      }
    } catch {
      // table may not exist yet on first run
    }
  }, [db, sessionKey]);

  // Save messages to DB whenever they change (after initial load)
  useEffect(() => {
    if (!db || !initialLoadDone.current) return;
    try {
      db.exec(`DELETE FROM chat_messages WHERE session_key = '${sessionKey.replace(/'/g, "''")}'`);
      for (const m of messages) {
        db.run(
          'INSERT INTO chat_messages (session_key, role, content) VALUES (?, ?, ?)',
          [sessionKey, m.role, m.content]
        );
      }
    } catch {
      // ignore save errors
    }
  }, [messages, db, sessionKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([DEFAULT_MSG]);
  }, []);

  const exportAsText = useCallback(() => {
    const text = messages.map(m => `[${m.role === 'user' ? 'You' : 'PhishGuard AI'}]: ${m.content}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  const exportAsPdf = useCallback(() => {
    const content = messages.map(m => {
      const sender = m.role === 'user' ? 'You' : 'PhishGuard AI';
      return `<div style="margin-bottom:12px"><strong style="color:${m.role === 'user' ? '#0ea5e9' : '#7c3aed'}">${sender}:</strong><div style="margin-top:4px;white-space:pre-wrap">${m.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>`;
    }).join('');
    const html = `<html><head><title>Chat History</title><style>body{font-family:Arial,sans-serif;padding:40px;max-width:700px;margin:0 auto}h1{color:#7c3aed;font-size:18px;border-bottom:2px solid #7c3aed;padding-bottom:8px}</style></head><body><h1>PhishGuard AI - Chat History</h1><p style="color:#888;font-size:12px">${new Date().toLocaleString()}</p>${content}</body></html>`;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.print(); }, 500);
    }
  }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setLoading(true);

    let assistantText = '';
    const updateAssistant = (chunk: string) => {
      assistantText += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && prev.length > allMessages.length) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantText } : m);
        }
        return [...prev.slice(0, allMessages.length), { role: 'assistant', content: assistantText }];
      });
    };

    try {
      await streamChat({
        messages: allMessages,
        onDelta: updateAssistant,
        onDone: () => setLoading(false),
        onError: (err) => {
          setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err}` }]);
          setLoading(false);
        },
      });
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connection error. Please try again.' }]);
      setLoading(false);
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  // Floating button for non-embedded mode
  if (!embedded && !open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 200); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center hover:scale-110 group"
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </button>
    );
  }

  const chatContent = (
    <div className={embedded ? "h-full flex flex-col" : "fixed bottom-6 right-6 z-50 w-[380px] h-[520px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <p className="font-orbitron text-sm font-bold">PhishGuard Support</p>
            <p className="text-[10px] opacity-80">AI-powered • Always online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(''); setTimeout(() => searchInputRef.current?.focus(), 100); }} className="hover:bg-white/20 rounded-full p-1 transition-colors" title="Search chat">
            <Search className="w-4 h-4" />
          </button>
          {messages.length > 1 && (
            <>
              <div className="relative group">
                <button className="hover:bg-white/20 rounded-full p-1 transition-colors" title="Export chat">
                  <Download className="w-4 h-4" />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-background border border-border rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
                  <button onClick={exportAsText} className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors">Export as Text</button>
                  <button onClick={exportAsPdf} className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors">Export as PDF</button>
                </div>
              </div>
              <button onClick={clearHistory} className="hover:bg-white/20 rounded-full p-1 transition-colors" title="Clear chat">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {!embedded && (
            <button onClick={() => setOpen(false)} className="hover:bg-white/20 rounded-full p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 shrink-0">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
          />
          {searchQuery && (
            <span className="text-xs text-muted-foreground shrink-0">
              {messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase())).length} found
            </span>
          )}
          <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.filter(m => !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())).map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap'
                : 'bg-muted text-foreground rounded-bl-md prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_pre]:bg-background/50 [&_pre]:rounded-lg [&_pre]:p-2 [&_code]:text-xs [&_code]:bg-background/50 [&_code]:px-1 [&_code]:rounded [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-foreground'
            } ${searchQuery && m.content.toLowerCase().includes(searchQuery.toLowerCase()) ? 'ring-2 ring-primary/50' : ''}`}>
              {m.role === 'assistant' ? (
                <ReactMarkdown>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-accent-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
          {QUICK_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50 text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 border-t border-border bg-background shrink-0">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type your question..."
          disabled={loading}
          className="flex-1 bg-muted rounded-full px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );

  return chatContent;
};

export default ChatBubbleWidget;
