'use client';
import { useState, useEffect } from 'react';

// --- 型定義 ---
type Method = {
  title: string;
  steps: string[];
};

type Situation = {
  question: string;
  answer: string;
};

type Tool = {
  name: string;
  url: string;
};

type Task = {
  id: number;
  name: string;
  interval: number;
  lastCleaned: string | null;
  scaryDescription: string;
  methods: Method[];
  situations: Situation[];
  tools: Tool[];
};

// --- カタログデータ（稼げる選抜商品・リンク済み） ---
const TASK_CATALOG: Omit<Task, 'id' | 'interval' | 'lastCleaned'>[] = [
  {
    name: 'お風呂の鏡',
    scaryDescription: '白いウロコ汚れは「石」と同じ成分。放置すると研磨機で削らないと取れなくなり、自分の顔が見えなくなります。',
    methods: [{ title: 'パックで溶かす', steps: ['クエン酸水をスプレーする', 'ラップを貼り付けて1時間放置', '丸めたラップでこする'] }],
    situations: [{ question: '全く落ちない', answer: '最強の研磨剤「茂木和哉」か、ダイヤモンドパッドを使うしかありません。' }],
    // ★選抜理由: テレビでおなじみ。2000円と単価も良く、効果が目に見えるので売れやすい
    tools: [{ name: '茂木和哉 (水垢洗剤)', url: 'https://www.amazon.co.jp/s?k=茂木和哉+水垢洗剤&tag=soujipartnera-22' }]
  },
  {
    name: '洗濯槽',
    scaryDescription: '見えない裏側は黒カビの巣窟。洗ったはずの服に「ワカメ」みたいなカビが付着し、生乾き臭の原因になります。',
    methods: [{ title: 'ほったらかし洗浄', steps: ['専用クリーナーを入れる', '「槽洗浄コース」ボタンを押す', '待つだけで終了'] }],
    situations: [{ question: 'オキシクリーンでもいい？', answer: 'OKですが、浮いてきた大量のワカメ（カビ）を網ですくう作業が地獄なので、純正クリーナーが一番楽です。' }],
    // ★選抜理由: 定番中の定番。液体タイプで手間いらず。
    tools: [{ name: '洗たく槽カビキラー', url: 'https://www.amazon.co.jp/s?k=洗たく槽カビキラー&tag=soujipartnera-22' }]
  },
  {
    name: 'キッチンの換気扇',
    scaryDescription: '油が酸化して茶色いヘドロ化します。吸い込みが悪くなり、部屋中が料理臭くなります。引越し時の退去費用が高額になるNo.1箇所。',
    methods: [{ title: '熱湯漬け置き', steps: ['ゴミ袋に45度のお湯と重曹を入れる', 'ファンや網を1時間漬ける', '古歯ブラシでこする'] }],
    situations: [{ question: 'ベタベタが取れない', answer: '油汚れは温度が大事。冷たい水では落ちません。熱めのお湯を使ってください。' }],
    // ★選抜理由: 普通の重曹よりも「激落ちくん」ブランドの方がクリック率が高い
    tools: [{ name: '激落ちくんの重曹', url: 'https://www.amazon.co.jp/s?k=激落ちくん+重曹+粉末&tag=soujipartnera-22' }]
  },
  {
    name: '玄関・靴箱',
    scaryDescription: '靴の湿気でカビが発生し、玄関を開けた瞬間に「なんか臭い家」認定されます。風水的にも最悪です。',
    methods: [{ title: '全出しリセット', steps: ['靴を全部出す', 'ほうきで砂を掃き出す', 'アルコールで棚を拭く'] }],
    situations: [{ question: '靴が臭い', answer: '10円玉を靴に入れるか、重曹をお茶パックに入れて靴の中に入れておくと消臭されます。' }],
    // ★選抜理由: 置くだけでOKの無香空間。ド定番。
    tools: [{ name: 'ドでか無香空間', url: 'https://www.amazon.co.jp/s?k=ドでか無香空間&tag=soujipartnera-22' }]
  },
  {
    name: '冷蔵庫の中',
    scaryDescription: '野菜くずや液垂れ汁は、低温でも死なない菌の温床。食中毒のリスクがあります。製氷機はカビだらけかも。',
    methods: [{ title: 'アルコール拭き', steps: ['食材を寄せる', 'キッチンペーパーにアルコールをつけて拭く', '製氷タンクを洗う'] }],
    situations: [{ question: 'パッキンに黒ずみ', answer: 'カビです。塩素系漂白剤（ハイター）を綿棒につけてなぞってください。' }],
    // ★選抜理由: キッチン専用アルコールといえばこれ。
    tools: [{ name: 'カビキラー アルコール除菌', url: 'https://www.amazon.co.jp/s?k=カビキラー+アルコール除菌+キッチン&tag=soujipartnera-22' }]
  },
  {
    name: '排水口の奥（パイプ）',
    scaryDescription: '見えない部分で髪と油がつまり、ある日突然逆流します。業者を呼ぶと数万円コースです。',
    methods: [{ title: '溶かして流す', steps: ['パイプユニッシュを規定量流し込む', '30分放置', '大量の水で流す'] }],
    situations: [{ question: '流れが悪い', answer: '詰まりかけています。真空式パイプクリーナー（すっぽん）で物理的に抜くのが早いです。' }],
    // ★選抜理由: 誰もが知っている安心感でクリックされやすい。
    tools: [{ name: 'パイプユニッシュ', url: 'https://www.amazon.co.jp/s?k=パイプユニッシュ&tag=soujipartnera-22' }]
  },
  {
    name: 'ベランダ・網戸',
    scaryDescription: '排気ガスと砂埃で真っ黒。洗濯物を干すときに服が触れて汚れます。部屋の中に汚れた空気が入ってきます。',
    methods: [{ title: '新聞紙活用', steps: ['濡らした新聞紙を網戸に貼る', '10分後に剥がすと汚れも取れる', 'ベランダは水を流してデッキブラシ'] }],
    situations: [{ question: '水が流せない', answer: 'マンションなどで水禁止なら、濡らしたスポンジで少しずつこすり落とすしかありません。' }],
    // ★選抜理由: 水だけで網戸が綺麗になる最強のスポンジ・ブラシ。
    tools: [{ name: 'アズマ工業 網戸ブラシ', url: 'https://www.amazon.co.jp/s?k=アズマ工業+網戸ブラシ&tag=soujipartnera-22' }]
  },
  {
    name: 'カーペット・ラグ',
    scaryDescription: '人の皮脂と食べこぼしを食べにダニが集まり、その死骸をあなたが吸い込んでいます。アレルギーの原因。',
    methods: [{ title: '重曹掃除機', steps: ['重曹を全体に粉のまま撒く', '1時間放置して汚れを吸着させる', '掃除機でゆっくり吸い取る'] }],
    situations: [{ question: 'シミがある', answer: '中性洗剤を薄めた水を布につけ、トントン叩いてください（こすると広がる）。' }],
    // ★選抜理由: 【収益の柱】1万円前後の「リンサークリーナー」。これが売れるとデカイ。
    tools: [{ name: 'リンサークリーナー (アイリスオーヤマ)', url: 'https://www.amazon.co.jp/s?k=アイリスオーヤマ+リンサークリーナー&tag=soujipartnera-22' }]
  },
  {
    name: '電子レンジの中',
    scaryDescription: '飛び散った食品カスが炭化して発火の原因に。油汚れはGの大好物です。',
    methods: [{ title: '蒸気で瞬殺コース', steps: ['耐熱容器に水と重曹を入れる', '5分レンチンして蒸らす', 'キッチンペーパーで拭き取る'] }],
    situations: [{ question: '焦げ付きが取れない', answer: '重曹ペーストを塗ってラップし、1時間放置してからこすってください。' }],
    // ★選抜理由: 「チンしてふくだけ」という商品名がズボラ心に刺さる。
    tools: [{ name: 'チン! してふくだけ', url: 'https://www.amazon.co.jp/s?k=小林製薬+チンしてふくだけ&tag=soujipartnera-22' }]
  },
  {
    name: 'エアコンフィルター',
    scaryDescription: 'ホコリが詰まると電気代高騰＆カビの胞子を部屋中に撒き散らします。',
    methods: [{ title: '吸うだけコース', steps: ['フィルターを外す', '外側から掃除機をかける', '水洗いして陰干し'] }],
    situations: [{ question: 'カビ臭い', answer: 'フィルター掃除でも臭うなら内部のカビです。市販のスプレーか業者依頼が必要です。' }],
    // ★選抜理由: 【収益の柱】6000円前後のAnker製クリーナー。デザインが良く売れ筋。
    tools: [{ name: 'Anker Eufy (ハンディクリーナー)', url: 'https://www.amazon.co.jp/s?k=Anker+Eufy+HomeVac+H11&tag=soujipartnera-22' }]
  }
];

// --- 初期データ ---
const STUDIO_DATA: Task[] = [
  {
    id: 1,
    name: 'キッチンのシンク',
    interval: 3,
    lastCleaned: null,
    scaryDescription: '3日放置すると赤カビが発生し、排水口からはドブ臭が。食器に菌がつきます。',
    methods: [
      { title: '🍺 30秒コース', steps: ['スポンジで洗う', '水で流す', '乾いた布で拭く(重要)'] },
      { title: '✨ 週末プロコース', steps: ['重曹をまく', 'クエン酸水をかける', '10分放置して磨く'] }
    ],
    situations: [
      { question: 'ヌメリがひどい', answer: '雑菌の膜です。泡ハイターをかけて5分放置でOK。' },
      { question: 'サビが出ている', answer: 'もらいサビです。クリームクレンザーをラップにつけて磨いてください。' }
    ],
    // ★選抜理由: 激落ちくんの「キューブ」タイプは使いやすくて人気。
    tools: [{ name: '激落ちくん (キューブ)', url: 'https://www.amazon.co.jp/s?k=激落ちくん+キューブ&tag=soujipartnera-22' }]
  },
  {
    id: 2,
    name: 'トイレの便器',
    interval: 7,
    lastCleaned: null,
    scaryDescription: 'サボったリング（黒ずみ）は一度つくと落ちません。壁の尿飛び散りが悪臭の原因。',
    methods: [
      { title: '🚽 ついで掃除', steps: ['シートで便座→床を拭く', 'ブラシで中をこする'] },
      { title: '🧪 酸の力リセット', steps: ['紙を敷いて酸性洗剤をかける', '30分放置して流す'] }
    ],
    situations: [
      { question: '黄ばみがある', answer: '尿石です。酸性洗剤（サンポール）でパックしてください。' }
    ],
    // ★選抜理由: ズボラ掃除の代名詞。これ一択。
    tools: [{ name: '流せるトイレブラシ', url: 'https://www.amazon.co.jp/s?k=スクラビングバブル+流せるトイレブラシ&tag=soujipartnera-22' }]
  }
];

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isSetup, setIsSetup] = useState(false);
  const [view, setView] = useState<'list' | 'detail' | 'situation'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cleanedTaskName, setCleanedTaskName] = useState('');

  // ロード処理（バージョンを v14 に変更して強制更新）
  useEffect(() => {
    const saved = localStorage.getItem('cleaning-app-v14');
    if (saved) {
      setTasks(JSON.parse(saved));
      setIsSetup(true);
    } else {
      setIsSetup(false);
    }
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('cleaning-app-v14', JSON.stringify(newTasks));
  };

  const handleSetup = (type: 'studio' | 'family') => {
    saveTasks(STUDIO_DATA);
    setIsSetup(true);
  };

  const addFromCatalog = (template: typeof TASK_CATALOG[0]) => {
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const newTask: Task = { ...template, id: newId, interval: 7, lastCleaned: null };
    saveTasks([...tasks, newTask]);
    setShowAddModal(false);
  };

  const addCustomTask = (name: string, days: number) => {
    const newId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
    const newTask: Task = {
      id: newId, name: name, interval: days, lastCleaned: null,
      scaryDescription: '自分で設定した場所です。定期的に掃除しましょう。',
      methods: [{ title: 'いつもの掃除', steps: ['綺麗にする'] }],
      situations: [], tools: []
    };
    saveTasks([...tasks, newTask]);
    setShowAddModal(false);
  };

  const deleteTask = (id: number) => {
    if (confirm('本当に削除しますか？')) {
      const newTasks = tasks.filter(t => t.id !== id);
      saveTasks(newTasks);
      if (view === 'detail' && selectedTask?.id === id) {
        setView('list');
        setSelectedTask(null);
      }
    }
  };

  const updateInterval = (id: number, newInterval: number) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, interval: newInterval } : t);
    saveTasks(newTasks);
  };

  const updateTool = (task: Task, newTools: Tool[]) => {
    const updatedTask = { ...task, tools: newTools };
    const newTasks = tasks.map(t => t.id === task.id ? updatedTask : t);
    saveTasks(newTasks);
    setSelectedTask(updatedTask);
  };

  const addTool = (task: Task) => {
    const name = prompt('道具の名前を入力してください');
    if (!name) return;
    updateTool(task, [...task.tools, { name, url: '' }]);
  };

  const handleClean = (id: number, name: string) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, lastCleaned: new Date().toISOString() } : t);
    saveTasks(newTasks);
    setView('list');
    setSelectedTask(null);
    setCleanedTaskName(name);
    setShowSuccessModal(true);
  };

  const shareOnTwitter = () => {
    const text = `${cleanedTaskName}の掃除を完了しました！✨\n頑張ってきれいにしました！えらすぎる！\nみんなもお掃除頑張ろう！\n#CleaningList #お掃除`;
    const appUrl = 'https://osouji-app.vercel.app';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(appUrl)}`;
    window.open(url, '_blank');
  };

  const getCalendarUrl = (name: string) => {
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(name + 'の掃除')}`;
  };

  const getDaysAgo = (dateStr: string | null) => {
    if (!dateStr) return 999;
    return Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  // --- UI ---
  const SuccessModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl transform transition-all scale-100">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-indigo-700 mb-2">お疲れ様でした！</h3>
        <p className="text-gray-600 mb-6">「{cleanedTaskName}」がピカピカになりました✨<br/>部屋の空気が美味しいです！</p>
        <div className="space-y-3">
          <button onClick={shareOnTwitter} className="w-full bg-black text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition"><span>𝕏</span> Xで自慢する</button>
          <button onClick={() => setShowSuccessModal(false)} className="w-full bg-gray-100 text-gray-500 font-bold py-3 rounded-lg hover:bg-gray-200 transition">閉じる</button>
        </div>
      </div>
    </div>
  );

  const AddModal = () => (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">掃除場所を追加</h3>
          <button onClick={() => setShowAddModal(false)} className="text-2xl text-gray-400 font-bold">×</button>
        </div>
        <div className="p-4 overflow-y-auto space-y-6">
          <div>
            <h4 className="text-xs font-bold text-gray-500 mb-2">📚 カタログから選ぶ</h4>
            <div className="space-y-2">
              {TASK_CATALOG.map((item, i) => (
                <button key={i} onClick={() => addFromCatalog(item)} className="w-full text-left p-3 border rounded hover:bg-indigo-50 font-bold text-gray-700 bg-white">
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-500 mb-2">✨ オリジナル作成</h4>
            <form onSubmit={(e: any) => { e.preventDefault(); addCustomTask(e.target.name.value, parseInt(e.target.days.value)); }} className="flex gap-2">
              <input name="name" placeholder="場所名" className="border rounded p-2 flex-1 text-gray-800 bg-white" required />
              <input name="days" type="number" placeholder="日数" className="border rounded p-2 w-16 text-gray-800 bg-white" required />
              <button className="bg-indigo-600 text-white p-2 rounded font-bold whitespace-nowrap">追加</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <h1 className="text-4xl font-bold mb-4">Cleaning Partner</h1>
        <p className="mb-10 opacity-90 text-sm">あなたの部屋タイプを選んでください。<br/>最適なプランを自動作成します。</p>
        <div className="space-y-4 w-full max-w-xs">
          <button onClick={() => handleSetup('studio')} className="w-full bg-white text-indigo-600 font-bold py-5 rounded-2xl shadow-lg hover:scale-105 transition flex flex-col items-center gap-1"><span className="text-2xl">🏠</span><span>一人暮らし (1R / 1K)</span></button>
          <button onClick={() => handleSetup('family')} className="w-full bg-indigo-800/50 border border-white/30 text-white font-bold py-5 rounded-2xl hover:bg-indigo-800/70 transition flex flex-col items-center gap-1"><span className="text-2xl">👨‍👩‍👧‍👦</span><span>ファミリー・実家</span></button>
        </div>
        <p className="text-xs opacity-50 mt-8">※データは端末内に保存されます</p>
      </div>
    );
  }

  if (view === 'list') {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto relative">
        <header className="bg-white p-4 shadow sticky top-0 z-10 flex justify-between items-center">
          <h1 className="font-bold text-gray-800">Cleaning List</h1>
          <button onClick={() => setIsEditing(!isEditing)} className={`text-xs px-3 py-1.5 rounded border font-bold transition ${isEditing ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
            {isEditing ? '完了' : '編集モード'}
          </button>
        </header>
        <div className="p-4 space-y-4">
          {tasks.map(task => {
            const daysAgo = getDaysAgo(task.lastCleaned);
            const isDanger = daysAgo >= task.interval;
            return (
              <div key={task.id} onClick={() => { setSelectedTask(task); setView('detail'); }} className={`border-l-8 rounded-lg shadow bg-white p-4 relative cursor-pointer ${isDanger ? 'border-red-500 bg-red-50' : 'border-green-400'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h2 className="font-bold text-gray-800">{task.name}</h2>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                      <span>前回: {daysAgo === 999 ? '未実施' : `${daysAgo}日前`}</span>
                      <span className="text-gray-300">|</span>
                      <div className="flex items-center">
                        <span>目安: </span>
                        {isEditing ? (
                          <div className="flex items-center ml-1" onClick={e => e.stopPropagation()}>
                            <input type="number" value={task.interval} onChange={(e) => updateInterval(task.id, parseInt(e.target.value))} className="w-12 border border-gray-300 rounded px-1 py-0.5 text-center text-gray-800 bg-white"/>
                            <span className="ml-1">日</span>
                          </div>
                        ) : (<span className="ml-1">{task.interval}日</span>)}
                      </div>
                    </div>
                  </div>
                  {isEditing ? (
                    <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="bg-red-100 text-red-600 p-2 rounded-full hover:bg-red-200 transition z-10">🗑️</button>
                  ) : (isDanger && <span className="text-2xl animate-pulse">😱</span>)}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setShowAddModal(true)} className="fixed bottom-6 right-6 bg-indigo-600 text-white px-6 py-4 rounded-full shadow-2xl font-bold hover:scale-105 transition z-20 flex items-center gap-2"><span className="text-xl">＋</span> 場所を追加</button>
        {showAddModal && <AddModal />}
        {showSuccessModal && <SuccessModal />}
        
       <footer className="p-6 text-center text-xs text-gray-400 mt-8 bg-gray-100 rounded-t-xl">
          <p className="font-bold mb-2">⚠️ お掃除の注意</p>
          <ul className="text-left space-y-1 mb-4 inline-block max-w-xs mx-auto text-[10px] leading-relaxed">
            <li>・洗剤を混ぜると有毒ガスが発生する場合があります。「酸性」と「塩素系」は絶対に同時に使用しないでください。</li>
            <li>・素材によっては変色や傷の原因になります。必ず目立たない場所でテストしてからご使用ください。</li>
            <li>・当アプリの情報を用いて発生したトラブル・損失に対して、運営者は一切の責任を負いかねます。</li>
          </ul>
          
          <div className="border-t border-gray-300 w-1/2 mx-auto my-3"></div>

          {/* ▼▼▼ 追加：ご意見フォームへのリンク ▼▼▼ */}
          <div className="mb-4">
            <a 
              href="https://forms.gle/3NvKFTe5ET1twKNM6" 
              target="_blank" 
              rel="noreferrer"
              className="inline-block bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-full shadow-sm hover:bg-gray-50 transition text-[10px] font-bold"
            >
              💌 開発者に意見・要望を送る
            </a>
          </div>
          {/* ▲▲▲ ここまで ▲▲▲ */}
          
          <p className="text-[10px]">
            © 2025 ズボラ掃除パートナー<br/>
            Amazonのアソシエイトとして、ズボラ掃除パートナーは適格販売により収入を得ています。
          </p>
        </footer>

      </main>
    );
  }

  if (view === 'detail' && selectedTask) {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col pb-20">
        <div className={`text-white p-4 sticky top-0 flex justify-between items-center z-10 transition-colors ${isEditing ? 'bg-indigo-600' : 'bg-gray-800'}`}>
          <button onClick={() => setView('list')} className="text-sm font-bold">← 戻る</button>
          <h2 className="font-bold">{selectedTask.name} {isEditing && '(編集中)'}</h2>
          <div className="w-8"></div>
        </div>
        <div className="p-5 overflow-y-auto">
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl mb-6">
            <h3 className="text-red-800 font-bold text-xs mb-1">😱 放置すると...</h3>
            <p className="text-sm text-red-700">{selectedTask.scaryDescription}</p>
          </div>
          <div className="mb-6 space-y-4">
            <h3 className="font-bold text-gray-700">📖 掃除のやり方</h3>
            {selectedTask.methods.map((m, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg border">
                <h4 className="font-bold text-indigo-700 mb-2">{m.title}</h4>
                <ul className="list-disc list-inside text-sm text-gray-700">{m.steps.map((s, j) => <li key={j}>{s}</li>)}</ul>
              </div>
            ))}
            <button onClick={() => setView('situation')} className="w-full bg-orange-100 text-orange-800 font-bold py-3 rounded-lg border border-orange-200 hover:bg-orange-200">🆘 トラブル・Q&Aを見る</button>
          </div>
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-700">🛠️ 必要な道具</h3>
              {isEditing && <button onClick={() => addTool(selectedTask)} className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded font-bold">+ 道具追加</button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {selectedTask.tools.map((tool, idx) => (
                <div key={idx} className={`relative ${isEditing ? 'p-4 bg-gray-50 border border-dashed border-gray-300 rounded' : ''}`}>
                  {!isEditing ? (
                    <a href={tool.url || '#'} target="_blank" rel="noreferrer" className="block bg-white border border-gray-300 text-gray-700 text-sm font-bold py-3 px-2 rounded-lg text-center hover:bg-gray-50 transition">🛒 {tool.name}</a>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm text-gray-800">{tool.name}</span>
                         <button onClick={() => updateTool(selectedTask, selectedTask.tools.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-bold border border-red-200 px-2 rounded">削除</button>
                      </div>
                      <input className="text-[10px] border border-gray-300 p-1 rounded w-full text-gray-800 bg-white" placeholder="URL貼り付け" value={tool.url} onChange={(e) => { const newTools = [...selectedTask.tools]; newTools[idx].url = e.target.value; updateTool(selectedTask, newTools); }}/>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t">
            <a href={getCalendarUrl(selectedTask.name)} target="_blank" rel="noreferrer" className="block text-center text-sm text-gray-500 py-2 border rounded hover:bg-gray-50 transition">📅 カレンダー登録</a>
          </div>
        </div>
        {!isEditing && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t max-w-md mx-auto">
            <button onClick={() => handleClean(selectedTask.id, selectedTask.name)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition">✨ 掃除完了！</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'situation' && selectedTask) {
    return (
      <div className="min-h-screen bg-orange-50 max-w-md mx-auto flex flex-col">
        <div className="bg-orange-600 text-white p-4 sticky top-0 flex items-center justify-between z-10">
          <button onClick={() => setView('detail')} className="font-bold">← 戻る</button>
          <h2 className="font-bold">Q&A</h2>
          <div className="w-8"></div>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {selectedTask.situations.length === 0 && <p className="text-center text-gray-500">情報がありません</p>}
          {selectedTask.situations.map((s, i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
              <div className="font-bold text-orange-600 mb-2">Q. {s.question}</div>
              <div className="text-sm text-gray-700">A. {s.answer}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}