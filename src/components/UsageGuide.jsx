import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, Target, Trophy, BarChart3, Youtube, HelpCircle, ChevronRight, MousePointer2, Move, Upload } from 'lucide-react';

const UsageGuide = ({ onClose }) => {
  const steps = [
    {
      title: "ラリーの記録",
      icon: <Target className="text-indigo-400" />,
      content: [
        "コートをタップしてシャトルの落下地点を記録します。",
        "ボタンからスマッシュ、ドロップ、クリアなどの種類を選択！",
        "ミスか決定打かも自動で判別されます。"
      ],
      tip: "タップする場所で自分・相手のショットが切り替わります。"
    },
    {
      title: "得点とサイド変更",
      icon: <Trophy className="text-amber-400" />,
      content: [
        "ラリーが終わったら「得点（自分）」か「得点（相手）」をタップ。",
        "スコアが自動更新され、ラリーの内容が保存されます。",
        "コートの「自分」「相手」ラベルをタップするとコートを交代（サイドチェンジ）できます。"
      ]
    },
    {
      title: "詳細な分析レポート",
      icon: <BarChart3 className="text-emerald-400" />,
      content: [
        "「ログ」タブから過去の試合を選択してレポートを表示。",
        "シャトルの配球データ、ショット別成功率、連打の傾向などを可視化。",
        "エリアごとの詳細を確認して、自分の弱点や相手の癖を見極めましょう！"
      ]
    },
    {
      title: "YouTube動画連携",
      icon: <Youtube className="text-rose-400" />,
      content: [
        "保存画面やログ一覧から、試合動画をYouTubeにアップロードできます。",
        "アップロードは「限定公開」なので安心。データと動画が自動で紐付きます。",
        "撮影設定を 720p にすると、アップロードがよりスムーズになります。"
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 overflow-hidden"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-slate-900 w-full max-w-md max-h-[85vh] rounded-[2.5rem] border border-slate-800/60 overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-slate-800/60 flex justify-between items-center bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <HelpCircle className="text-indigo-400" size={24} />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-100 italic uppercase">How to Use</h3>
              <p className="text-[10px] font-bold text-slate-500">アプリの使い方ガイド</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {steps.map((step, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center font-black text-xs text-indigo-400">
                  {idx + 1}
                </div>
                <h4 className="font-black text-slate-200 text-sm flex items-center gap-2">
                  {step.icon}
                  {step.title}
                </h4>
              </div>
              <ul className="space-y-2 ml-11">
                {step.content.map((item, i) => (
                  <li key={i} className="text-[11px] font-bold text-slate-400 leading-relaxed flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {step.tip && (
                <div className="ml-11 p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                  <p className="text-[10px] font-black text-indigo-400 flex items-center gap-1.5">
                    <MousePointer2 size={12} />
                    TIP: {step.tip}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="p-6 bg-slate-950/40 border-t border-slate-800/60">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            分かりました！
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UsageGuide;
