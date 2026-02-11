import React, { useState, useEffect, useRef } from 'react';

// Google Sheets API設定
const SHEETS_CONFIG = {
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY,
  spreadsheetId: process.env.REACT_APP_SPREADSHEET_ID || '1Wl0Za3-lkHX7bkO4T7VeVf3-qRw_SUQJnFUUjlDazmQ',
  sheetName: 'Sheet1',
  range: 'A1:F100'
};

// スプレッドシートからデータを取得
async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.spreadsheetId}/values/${SHEETS_CONFIG.sheetName}!${SHEETS_CONFIG.range}?key=${SHEETS_CONFIG.apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return parseHierarchicalData(data.values || []);
  } catch (error) {
    console.error('スプレッドシート取得エラー:', error);
    return DEFAULT_DATA;
  }
}

// 階層型データをパース
function parseHierarchicalData(rows) {
  const tree = {
    level0: []
  };

  let currentPath = [];
  
  rows.forEach((row, rowIndex) => {
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = row[colIndex];
      
      if (cellValue && cellValue.trim() !== '') {
        const level = colIndex;
        currentPath = currentPath.slice(0, level);
        currentPath[level] = cellValue;
        
        const pathKey = currentPath.join('.');
        const parentKey = currentPath.slice(0, -1).join('.');
        
        if (!tree[pathKey]) {
          tree[pathKey] = {
            id: pathKey,
            value: cellValue,
            level: level,
            rowIndex: rowIndex,
            children: [],
            parent: parentKey || null
          };
        }
        
        if (level === 0) {
          if (!tree.level0.includes(pathKey)) {
            tree.level0.push(pathKey);
          }
        } else if (parentKey && tree[parentKey]) {
          if (!tree[parentKey].children.includes(pathKey)) {
            tree[parentKey].children.push(pathKey);
          }
        }
        
        break;
      }
    }
  });

  return tree;
}

// フォールバック用デフォルトデータ
const DEFAULT_DATA = {
  level0: ['A', 'B', 'C', 'D'],
  'A': {
    id: 'A',
    value: 'A',
    level: 0,
    rowIndex: 0,
    children: ['A.1', 'A.2', 'A.3', 'A.4'],
    parent: null
  },
  'A.1': {
    id: 'A.1',
    value: '1',
    level: 1,
    rowIndex: 1,
    children: ['A.1.①', 'A.1.②', 'A.1.③'],
    parent: 'A'
  },
  'B': {
    id: 'B',
    value: 'B',
    level: 0,
    rowIndex: 15,
    children: ['B.1', 'B.2'],
    parent: null
  },
  'C': {
    id: 'C',
    value: 'C',
    level: 0,
    rowIndex: 34,
    children: ['C.1', 'C.2'],
    parent: null
  },
  'D': {
    id: 'D',
    value: 'D',
    level: 0,
    rowIndex: 51,
    children: ['D.1', 'D.2'],
    parent: null
  }
};

const TICKET_STORAGE_KEY = 'salon_tickets';

function ChatbotConcierge() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [treeData, setTreeData] = useState(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyForm, setEmergencyForm] = useState({
    name: '',
    email: '',
    store: '',
    situation: ''
  });
  const [tickets, setTickets] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadTreeData();
  }, []);

  async function loadTreeData() {
    setIsLoading(true);
    try {
      const data = await fetchSheetData();
      if (data.level0.length > 0) {
        setTreeData(data);
        console.log('✅ 階層データを読み込みました', data);
      }
    } catch (error) {
      console.error('❌ データ読み込みエラー', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage('いらっしゃいませ！\nご用件をお選びください。');
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem(TICKET_STORAGE_KEY);
    if (stored) {
      setTickets(JSON.parse(stored));
    }
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'bot',
      text
    }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      type: 'user',
      text
    }]);
  };

  const createTicket = (type, data) => {
    const ticket = {
      id: `TICKET-${Date.now()}`,
      type,
      createdAt: new Date().toISOString(),
      status: 'open',
      data
    };

    const newTickets = [...tickets, ticket];
    setTickets(newTickets);
    localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(newTickets));

    console.log(type === 'emergency' ? '🚨 緊急チケット:' : '📋 一般チケット:', ticket);
    return ticket;
  };

  const handleOptionSelect = (nodeId) => {
    const node = treeData[nodeId];
    if (!node) return;

    const newPath = nodeId.split('.');
    addUserMessage(node.value);

    if (node.children && node.children.length > 0) {
      setCurrentPath(newPath);
      
      setTimeout(() => {
        const breadcrumb = newPath.map(p => {
          const n = treeData[newPath.slice(0, newPath.indexOf(p) + 1).join('.')];
          return n ? n.value : p;
        }).join(' > ');
        
        addBotMessage(`${breadcrumb}\n\n続けて選択してください。`);
      }, 500);
    } else {
      setTimeout(() => {
        const pathText = newPath.map(p => {
          const n = treeData[newPath.slice(0, newPath.indexOf(p) + 1).join('.')];
          return n ? n.value : p;
        }).join(' > ');
        
        addBotMessage(`選択されました：${pathText}\n\nこちらについての詳細をお調べします。`);
        
        createTicket('general', {
          path: pathText,
          nodeId: nodeId
        });
        
        setTimeout(() => {
          addBotMessage('他にご質問はございますか？');
          setCurrentPath([]);
        }, 1000);
      }, 500);
    }
  };

  const handleGoBack = () => {
    if (currentPath.length === 0) return;
    
    const newPath = currentPath.slice(0, -1);
    setCurrentPath(newPath);
    
    addUserMessage('一つ前に戻る');
    
    setTimeout(() => {
      if (newPath.length === 0) {
        addBotMessage('最初の選択に戻ります。');
      } else {
        const breadcrumb = newPath.map(p => {
          const n = treeData[newPath.slice(0, newPath.indexOf(p) + 1).join('.')];
          return n ? n.value : p;
        }).join(' > ');
        addBotMessage(`${breadcrumb}\n\n選択してください。`);
      }
    }, 300);
  };

  const handleEmergencyRequest = () => {
    addUserMessage('緊急の問い合わせ');
    
    setTimeout(() => {
      addBotMessage('⚠️ ご迷惑をおかけしており申し訳ございません。\n\nオペレーターが直接お伺いいたします。\n以下の情報をご入力ください。');
    }, 500);
  };

  const handleEmergencyFormSubmit = () => {
    if (!emergencyForm.name || !emergencyForm.email || !emergencyForm.store || !emergencyForm.situation) {
      alert('すべての項目をご入力ください');
      return;
    }

    addUserMessage(`お名前: ${emergencyForm.name}\nメール: ${emergencyForm.email}\n店舗: ${emergencyForm.store}\n状況: ${emergencyForm.situation}`);

    createTicket('emergency', { ...emergencyForm });

    setTimeout(() => {
      addBotMessage('✅ 緊急対応チケットを作成しました。\n\nスタッフより至急ご連絡いたします。');
      setCurrentPath([]);
    }, 500);

    setEmergencyForm({ name: '', email: '', store: '', situation: '' });
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentPath([]);
    setEmergencyForm({ name: '', email: '', store: '', situation: '' });
    setTimeout(() => {
      addBotMessage('いらっしゃいませ！\nご用件をお選びください。');
    }, 100);
  };

  const reloadData = async () => {
    await loadTreeData();
    resetChat();
    alert('データを再読み込みしました');
  };

  const getCurrentOptions = () => {
    if (currentPath.length === 0) {
      return treeData.level0.map(id => treeData[id]).filter(Boolean);
    } else {
      const currentNodeId = currentPath.join('.');
      const currentNode = treeData[currentNodeId];
      
      if (currentNode && currentNode.children) {
        return currentNode.children.map(id => treeData[id]).filter(Boolean);
      }
    }
    return [];
  };

  const currentOptions = getCurrentOptions();
  const isEmergencyView = messages.length > 0 && 
    messages[messages.length - 1].text.includes('オペレーターが直接お伺い');

  if (isLoading && !isOpen) {
    return (
      <div className="fixed bottom-24 right-6 z-50 flex items-center justify-center size-16 rounded-full bg-gray-300 text-white">
        <div className="animate-spin">
          <span className="material-symbols-outlined text-3xl">refresh</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        style={{ boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)' }}
      >
        {isOpen ? (
          <span className="material-symbols-outlined text-3xl">close</span>
        ) : (
          <span className="material-symbols-outlined text-3xl">chat</span>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-200px)] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-gradient-to-r from-sky-400 to-blue-500 px-6 py-4 flex items-center gap-3">
            <div className="size-12 rounded-full overflow-hidden bg-white/90 flex items-center justify-center">
              <img 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwUwtICfp5-z5algJ-FBAaUFq0Kf50VhZHenQ4CAvA_rNlNc4bclYo5zIMaiGBhDxQsLg5zU8_AZboqcg3dI1QXi5kKDkcdMokbLppTc7TDI8tDwq99e2A0EERFwknjrG2fIZ2HGskUrXG350j4oGpZHpm824Kh2a0C1mcR2Jfm13Cfk9UHoDueLAf9Wfjk0q55tlI_Lg7ldLPW-pDMJXZ3gXXXy412Ycqk7fh0K78PpfZPY_GgUwJi8FcTUdW7GLVYCHllxoFgvg"
                alt="Bear" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-lg">クマのコンシェルジュ</h3>
              <p className="text-white/80 text-xs">
                {currentPath.length > 0 ? `階層: ${currentPath.length + 1}` : 'トップ'}
              </p>
            </div>
            <button onClick={reloadData} className="text-white/80 hover:text-white">
              <span className="material-symbols-outlined text-xl">sync</span>
            </button>
            <button onClick={resetChat} className="text-white/80 hover:text-white">
              <span className="material-symbols-outlined text-xl">refresh</span>
            </button>
          </div>

          {currentPath.length > 0 && (
            <div className="bg-sky-50 px-4 py-2 border-b border-sky-100">
              <div className="flex items-center gap-2 text-xs text-sky-700">
                <span className="material-symbols-outlined text-sm">home</span>
                {currentPath.map((pathItem, idx) => {
                  const nodeId = currentPath.slice(0, idx + 1).join('.');
                  const node = treeData[nodeId];
                  return (
                    <React.Fragment key={idx}>
                      <span className="text-sky-400">›</span>
                      <span className="font-medium">{node ? node.value : pathItem}</span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.type === 'bot' && (
                  <div className="size-8 rounded-full overflow-hidden bg-white flex items-center justify-center mr-2 shrink-0 mt-1">
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwUwtICfp5-z5algJ-FBAaUFq0Kf50VhZHenQ4CAvA_rNlNc4bclYo5zIMaiGBhDxQsLg5zU8_AZboqcg3dI1QXi5kKDkcdMokbLppTc7TDI8tDwq99e2A0EERFwknjrG2fIZ2HGskUrXG350j4oGpZHpm824Kh2a0C1mcR2Jfm13Cfk9UHoDueLAf9Wfjk0q55tlI_Lg7ldLPW-pDMJXZ3gXXXy412Ycqk7fh0K78PpfZPY_GgUwJi8FcTUdW7GLVYCHllxoFgvg"
                      alt="Bear" 
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-col max-w-[75%]">
                  <div className={`px-4 py-3 rounded-2xl ${
                    msg.type === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-sm' 
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</p>
                  </div>

                  {msg.type === 'bot' && index === messages.length - 1 && !isEmergencyView && (
                    <div className="mt-3 space-y-2">
                      {currentOptions.map((option, idx) => {
                        const hasChildren = option.children && option.children.length > 0;
                        const levelColor = ['sky', 'indigo', 'purple', 'pink', 'rose', 'orange'][option.level % 6];
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(option.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl bg-white border-2 border-${levelColor}-100 hover:border-${levelColor}-300 hover:bg-${levelColor}-50 transition-all duration-200 flex items-center gap-3 shadow-sm`}
                          >
                            <div className={`size-10 rounded-lg bg-${levelColor}-100 text-${levelColor}-600 flex items-center justify-center shrink-0 font-bold`}>
                              {option.value}
                            </div>
                            <span className="text-sm font-medium text-gray-700 flex-1">
                              {option.value}
                            </span>
                            {hasChildren && (
                              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                            )}
                          </button>
                        );
                      })}

                      {currentPath.length > 0 && (
                        <button
                          onClick={handleGoBack}
                          className="w-full text-left px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-gray-600">arrow_back</span>
                          <span className="text-sm text-gray-600">一つ前に戻る</span>
                        </button>
                      )}

                      {currentPath.length === 0 && (
                        <button
                          onClick={handleEmergencyRequest}
                          className="w-full text-left px-4 py-3 rounded-xl bg-red-50 border-2 border-red-200 hover:border-red-300 hover:bg-red-100 transition-all duration-200 flex items-center gap-3 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-red-600">priority_high</span>
                          <span className="text-sm font-bold text-red-600 flex-1">緊急の問い合わせ</span>
                        </button>
                      )}
                    </div>
                  )}

                  {msg.type === 'bot' && index === messages.length - 1 && isEmergencyView && (
                    <div className="mt-3 space-y-3 bg-red-50 p-4 rounded-xl border-2 border-red-200">
                      <input
                        type="text"
                        value={emergencyForm.name}
                        onChange={(e) => setEmergencyForm({...emergencyForm, name: e.target.value})}
                        placeholder="お名前 *"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                      />
                      <input
                        type="email"
                        value={emergencyForm.email}
                        onChange={(e) => setEmergencyForm({...emergencyForm, email: e.target.value})}
                        placeholder="メールアドレス *"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={emergencyForm.store}
                        onChange={(e) => setEmergencyForm({...emergencyForm, store: e.target.value})}
                        placeholder="ご予約店舗名 *"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                      />
                      <textarea
                        value={emergencyForm.situation}
                        onChange={(e) => setEmergencyForm({...emergencyForm, situation: e.target.value})}
                        placeholder="状況を詳しく教えてください *"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none resize-none"
                        rows={3}
                      />
                      <button
                        onClick={handleEmergencyFormSubmit}
                        className="w-full bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">priority_high</span>
                        緊急対応を依頼
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 bg-white border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              💬 階層: {currentPath.length + 1}階層目 / スプレッドシート連動
            </p>
          </div>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-lg p-3 text-xs">
          <div className="font-bold mb-1">チケット状況</div>
          <div className="text-red-600">🚨 緊急: {tickets.filter(t => t.type === 'emergency').length}件</div>
          <div className="text-blue-600">📋 一般: {tickets.filter(t => t.type === 'general').length}件</div>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-sky-100 via-sky-200 to-blue-300">
      <header className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0 z-20">
        <button className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white">
          <span className="material-symbols-outlined text-xl">arrow_back_ios_new</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full overflow-hidden border border-white/40 bg-white/90 flex items-center justify-center">
            <img 
              alt="Header Bear" 
              className="w-7 h-7 object-contain" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwUwtICfp5-z5algJ-FBAaUFq0Kf50VhZHenQ4CAvA_rNlNc4bclYo5zIMaiGBhDxQsLg5zU8_AZboqcg3dI1QXi5kKDkcdMokbLppTc7TDI8tDwq99e2A0EERFwknjrG2fIZ2HGskUrXG350j4oGpZHpm824Kh2a0C1mcR2Jfm13Cfk9UHoDueLAf9Wfjk0q55tlI_Lg7ldLPW-pDMJXZ3gXXXy412Ycqk7fh0K78PpfZPY_GgUwJi8FcTUdW7GLVYCHllxoFgvg"
            />
          </div>
          <h1 className="text-base font-bold tracking-wider text-white">予約管理</h1>
        </div>
        <button className="flex size-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white">
          <span className="material-symbols-outlined text-xl">more_horiz</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6 flex flex-col items-center">
        <div className="w-full flex flex-col items-center mb-8">
          <div className="relative w-44 h-44 mb-6" style={{ filter: 'drop-shadow(0 12px 20px rgba(0, 56, 101, 0.2))' }}>
            <div className="absolute inset-0 bg-white/20 blur-[50px] rounded-full"></div>
            <img 
              alt="Concierge Bear" 
              className="w-full h-full object-contain relative z-10" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAwUwtICfp5-z5algJ-FBAaUFq0Kf50VhZHenQ4CAvA_rNlNc4bclYo5zIMaiGBhDxQsLg5zU8_AZboqcg3dI1QXi5kKDkcdMokbLppTc7TDI8tDwq99e2A0EERFwknjrG2fIZ2HGskUrXG350j4oGpZHpm824Kh2a0C1mcR2Jfm13Cfk9UHoDueLAf9Wfjk0q55tlI_Lg7ldLPW-pDMJXZ3gXXXy412Ycqk7fh0K78PpfZPY_GgUwJi8FcTUdW7GLVYCHllxoFgvg"
            />
          </div>
          <div className="bg-white/85 backdrop-blur-md px-8 py-5 rounded-[2.5rem] relative max-w-full text-center border border-white/40 shadow-lg">
            <h2 className="text-[16px] font-bold leading-relaxed text-blue-900">
              ご不明な点がございましたら<br/>
              右下のチャットボタンから<br/>
              階層的にご案内いたします！
            </h2>
          </div>
        </div>

        <div className="w-full bg-white/30 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-start gap-3 mb-6">
          <span className="material-symbols-outlined text-white text-xl">info</span>
          <p className="text-[12px] leading-relaxed text-white font-medium">
            スプレッドシートの階層構造に対応。列が増えても自動的に対応します。
          </p>
        </div>
      </main>

      <nav className="flex items-center justify-around bg-white px-6 pb-9 pt-4 shrink-0 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,56,101,0.1)]">
        <a className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-sky-500 transition-colors" href="#">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[10px] font-bold">ホーム</span>
        </a>
        <a className="flex flex-col items-center gap-1.5 text-sky-500 relative" href="#">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
          <span className="text-[10px] font-bold">チャット</span>
          <div className="absolute -top-1 -right-1 size-2 bg-rose-500 rounded-full border-2 border-white"></div>
        </a>
        <a className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-sky-500 transition-colors" href="#">
          <span className="material-symbols-outlined">event</span>
          <span className="text-[10px] font-bold">予約</span>
        </a>
        <a className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-sky-500 transition-colors" href="#">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px] font-bold">マイページ</span>
        </a>
      </nav>

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-200 rounded-full pointer-events-none"></div>

      <ChatbotConcierge />
    </div>
  );
}
