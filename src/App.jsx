import React, { useState, useEffect } from 'react'
import { Trophy, Target, Layout, ChevronRight, Share2, Settings, Undo2, Trash2, CheckCircle2, Map as MapIcon, Layers, Save, History, BarChart3, XCircle, LogOut, Pencil, Video, Youtube, HelpCircle } from 'lucide-react'
import { GoogleAuthProvider } from 'firebase/auth'

import YouTubeUploader from './components/YouTubeUploader'
import UsageGuide from './components/UsageGuide'
import BadmintonCourt from './components/BadmintonCourt'
import { motion, AnimatePresence } from 'framer-motion'
import { auth, googleProvider, db } from './firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts'

const ShuttleIcon = ({ size = 48, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2C10.8954 2 10 2.89543 10 4V6C10 7.10457 10.8954 8 12 8C13.1046 8 14 7.10457 14 6V4C14 2.89543 13.1046 2 12 2Z" fill="currentColor" />
    <path d="M6 10L10 22H14L18 10H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 13H15M8.5 16H15.5M8 19H16" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

const SHOT_TYPES = [
  { id: 'hairpin', label: 'ヘアピン', color: 'bg-fuchsia-400', border: 'border-fuchsia-600' },
  { id: 'smash', label: 'スマッシュ', color: 'bg-rose-500', border: 'border-rose-700' },
  { id: 'drop', label: 'ドロップ', color: 'bg-sky-400', border: 'border-sky-600' },
  { id: 'clear', label: 'クリア', color: 'bg-emerald-400', border: 'border-emerald-600' },
  { id: 'lob', label: 'ロブ', color: 'bg-violet-400', border: 'border-violet-600' },
  { id: 'drive', label: 'ドライブ', color: 'bg-cyan-400', border: 'border-cyan-600' },
  { id: 'service', label: 'サーブ', color: 'bg-amber-400', border: 'border-amber-600' },
]

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [accessToken, setAccessToken] = useState(null)
  const [activeTab, setActiveTab] = useState('rally')
  const [shots, setShots] = useState([])
  const [selectedType, setSelectedType] = useState('smash')
  const [isWin, setIsWin] = useState(true)
  const [sessions, setSessions] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [metadata, setMetadata] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    tournament: '', 
    myName: '', 
    opponentTeam: '', 
    opponentName: '',
    youtubeId: ''
  })
  const [rallyPoints, setRallyPoints] = useState([])
  const [saveFlash, setSaveFlash] = useState(null)
  const [score, setScore] = useState({ self: 0, opponent: 0, set: 1 })
  const [selectedSessionIds, setSelectedSessionIds] = useState(new Set())
  const [isBottomSelf, setIsBottomSelf] = useState(true)
  const [analysisMode, setAnalysisMode] = useState('total') // 'total' or 'shot'
  const [targetShot, setTargetShot] = useState('smash')
  const [selectedSegment, setSelectedSegment] = useState(null)
  const [responseOrigin, setResponseOrigin] = useState('opponent') // 'self' or 'opponent'
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [editMetadata, setEditMetadata] = useState({ 
    tournament: '', 
    myName: '', 
    opponentTeam: '', 
    opponentName: '',
    selfScore: 0,
    opponentScore: 0
  })
  const [currentRallyIndex, setCurrentRallyIndex] = useState(0)
  const [lastShotOrigin, setLastShotOrigin] = useState('self')
  const [activeUploadSessionId, setActiveUploadSessionId] = useState(null)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [logSortOrder, setLogSortOrder] = useState('desc') // 'desc' or 'asc'
  const [isManualVideoInput, setIsManualVideoInput] = useState(false)
  const [manualVideoUrl, setManualVideoUrl] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    if (user.guest) {
      const saved = localStorage.getItem('tactics_sessions')
      if (saved) setSessions(JSON.parse(saved))
      return
    }
    const q = query(
      collection(db, `users/${user.uid}/sessions`),
      orderBy('createdAt', logSortOrder)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setSessions(docs)
    })
    return () => unsubscribe()
  }, [user, logSortOrder])

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      setAccessToken(credential.accessToken)
    } catch (err) {
      console.error('Login failed:', err)
      alert('ログインに失敗しました')
    }
  }

  const handleLogout = () => {
    if (window.confirm('ログアウトしますか？')) {
      signOut(auth)
      setUser(null)
      setAccessToken(null)
    }
  }

  const toggleSides = () => {
    setIsBottomSelf(!isBottomSelf);
    // 反転した座標をセットする
    const flippedPoints = rallyPoints.map(p => ({ ...p, y: 100 - p.y }));
    setRallyPoints(flippedPoints);
  };

  const handlePointClick = (point) => {
    const typeInfo = SHOT_TYPES.find(t => t.id === selectedType)
    setRallyPoints(prev => [...prev, { ...point, ...typeInfo }])
  }

  const saveRally = (winner) => {
    if (rallyPoints.length === 0) return

    // 座標を常に「自分＝下」の状態に正規化して保存する
    const normalizedPoints = isBottomSelf 
      ? [...rallyPoints] 
      : rallyPoints.map(p => ({ ...p, y: 100 - p.y }));

    const rallyData = {
      id: Date.now(),
      points: normalizedPoints,
      winner,
      label: 'ラリー',
      color: winner === 'self' ? 'bg-indigo-400' : 'bg-rose-500',
      type: 'rally',
      isWin: winner === 'self',
      scoreAtPoint: `${score.self}-${score.opponent}`,
      set: score.set
    }
    setShots(prev => [...prev, rallyData])
    setRallyPoints([])
    setSaveFlash(winner)

    setScore(prev => ({
      ...prev,
      [winner === 'self' ? 'self' : 'opponent']: prev[winner === 'self' ? 'self' : 'opponent'] + 1
    }))

    setTimeout(() => setSaveFlash(null), 300)
  }

  const openEditModal = (session) => {
    setEditingSessionId(session.id)
    setEditMetadata({
      tournament: session.tournament || '',
      myName: session.myName || '',
      opponentTeam: session.opponentTeam || '',
      opponentName: session.opponentName || '',
      selfScore: session.score?.self ?? 0,
      opponentScore: session.score?.opponent ?? 0
    })
    setShowEditModal(true)
  }

  const updateSessionMetadata = async () => {
    if (!editingSessionId) return

    if (user && !user.guest) {
      try {
        const sessionRef = doc(db, `users/${user.uid}/sessions`, editingSessionId)
        await updateDoc(sessionRef, {
          tournament: editMetadata.tournament,
          myName: editMetadata.myName,
          opponentTeam: editMetadata.opponentTeam,
          opponentName: editMetadata.opponentName,
          score: {
            self: Number(editMetadata.selfScore),
            opponent: Number(editMetadata.opponentScore)
          },
          updatedAt: serverTimestamp()
        })
      } catch (err) {
        console.error('Update failed:', err)
        alert('更新に失敗しました')
      }
    } else {
      const updated = sessions.map(s => 
        s.id === editingSessionId ? { 
          ...s, 
          tournament: editMetadata.tournament,
          myName: editMetadata.myName,
          opponentTeam: editMetadata.opponentTeam,
          opponentName: editMetadata.opponentName,
          score: {
            self: Number(editMetadata.selfScore),
            opponent: Number(editMetadata.opponentScore)
          }
        } : s
      )
      setSessions(updated)
      localStorage.setItem('tactics_sessions', JSON.stringify(updated))
    }

    setShowEditModal(false)
    setEditingSessionId(null)
    alert('更新が完了しました')
  }

  const saveSession = async () => {
    if (shots.length === 0) return
    const newSession = {
      date: new Date().toLocaleString(),
      shots: [...shots],
      score: { ...score },
      ...metadata
    }

    if (user && !user.guest) {
      try {
        await addDoc(collection(db, `users/${user.uid}/sessions`), {
          ...newSession,
          createdAt: serverTimestamp()
        })
      } catch (err) {
        console.error('Cloud save failed:', err)
        alert('保存に失敗しました')
      }
    } else {
      const updated = [{ ...newSession, id: Date.now() }, ...sessions]
      setSessions(updated)
      localStorage.setItem('tactics_sessions', JSON.stringify(updated))
    }

    setShots([])
    setScore({ self: 0, opponent: 0, set: 1 })
    setMetadata({ 
      date: new Date().toISOString().split('T')[0], 
      tournament: '', 
      myName: '', 
      opponentTeam: '', 
      opponentName: '' 
    })
    setShowSaveModal(false)
    alert('保存完了しました')
  }

  const deleteSession = async (id) => {
    if (!window.confirm('削除しますか？')) return
    if (user && !user.guest) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/sessions`, id))
      } catch (err) {
        console.error('Delete failed:', err)
      }
    } else {
      const updated = sessions.filter(s => s.id !== id)
      setSessions(updated)
      localStorage.setItem('tactics_sessions', JSON.stringify(updated))
    }
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }

  const toggleSessionSelection = (id) => {
    setSelectedSessionIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const viewReportForSessions = (ids = []) => {
    const newSet = new Set(ids)
    setSelectedSessionIds(newSet)
    setActiveTab('results')
  }

  const clearShots = () => {
    if (window.confirm('リセットしますか？')) setRallyPoints([])
  }

  const undoShot = () => {
    setRallyPoints(prev => prev.slice(0, -1))
  }

  const resetRally = () => {
    setRallyPoints([]);
  }

  const getStats = () => {
    let targetSessions = selectedSessionIds.size > 0
      ? sessions.filter(s => selectedSessionIds.has(s.id))
      : sessions;

    const allShots = targetSessions.flatMap(s => s.shots)
    const combinedShots = selectedSessionIds.size === 0 ? [...allShots, ...shots] : allShots
    const rallyShots = combinedShots.filter(s => s.type === 'rally')
    if (rallyShots.length === 0) return null

    const allRallyPoints = rallyShots.flatMap(s => s.points)
    const totalRallies = rallyShots.length

    // 五角形レーダーチャート用 (サーブとドライブを除外)
    const RADAR_SHOTS = SHOT_TYPES.filter(t => !['service', 'drive'].includes(t.id))
    
    // 自分のショット使用割合 (常に 自分=下 として計算)
    const selfPoints = rallyShots.flatMap(s => s.points.filter((p) => p.y < 50))
    const opponentPoints = rallyShots.flatMap(s => s.points.filter((p) => p.y > 50))

    let maxUsage = 0;
    const shotUsage = RADAR_SHOTS.map(type => {
      const selfCount = selfPoints.filter(p => p.id === type.id || p.label === type.label).length;
      const oppCount = opponentPoints.filter(p => p.id === type.id || p.label === type.label).length;
      const sVal = selfPoints.length > 0 ? Math.round((selfCount / selfPoints.length) * 100) : 0;
      const oVal = opponentPoints.length > 0 ? Math.round((oppCount / opponentPoints.length) * 100) : 0;
      maxUsage = Math.max(maxUsage, sVal, oVal);
      return {
        subject: type.label,
        self: sVal,
        opponent: oVal,
        fullMark: 100,
      }
    })

    // 9分割分析ロジック
    const getSegment = (x, y) => {
        const col = Math.min(2, Math.floor(x / 33.34));
        const relY = y % 50;
        let row;
        if (relY < 5.7) row = 0; // Back
        else if (relY < 35.2) row = 1; // Mid
        else row = 2; // Front
        return row * 3 + col;
    }

    const segments = Array.from({ length: 18 }, () => ({ shots: {} })); // 0-8: 上コート, 9-17: 下コート

    allRallyPoints.forEach((p) => {
        const isUpper = p.y < 50;
        const segIdx = getSegment(p.x, p.y) + (isUpper ? 0 : 9);
        const shotId = p.id;
        segments[segIdx].shots[shotId] = (segments[segIdx].shots[shotId] || 0) + 1;
    })

    const winnerSegments = Array.from({ length: 18 }, () => ({ shots: {} }));
    const loserSegments = Array.from({ length: 18 }, () => ({ shots: {} }));

    rallyShots.forEach(rally => {
        if (rally.points.length === 0) return;
        const lastPoint = rally.points[rally.points.length - 1];
        const segIdx = getSegment(lastPoint.x, lastPoint.y) + (lastPoint.y < 50 ? 0 : 9);
        if (rally.isWin) {
            winnerSegments[segIdx].shots[lastPoint.id] = (winnerSegments[segIdx].shots[lastPoint.id] || 0) + 1;
        } else {
            loserSegments[segIdx].shots[lastPoint.id] = (loserSegments[segIdx].shots[lastPoint.id] || 0) + 1;
        }
    });

    // 返球分析: 起点ショット後の返球分布
    const responseMap = { self: {}, opponent: {} };
    rallyShots.forEach(rally => {
        for (let i = 0; i < rally.points.length - 1; i++) {
            const p1 = rally.points[i];
            const p2 = rally.points[i+1];
            
            // p1を打った場所で判断 (常に 自分=下 として計算)
            const p1IsSelf = p1.y > 50;
            const origin = p1IsSelf ? 'self' : 'opponent';

            if (!responseMap[origin][p1.id]) responseMap[origin][p1.id] = [];
            responseMap[origin][p1.id].push({ 
                startX: p1.x, 
                startY: p1.y, 
                endX: p2.x, 
                endY: p2.y, 
                id: p2.id 
            });
        }
    })

    // ラリー数別得点率
    const rallyGroups = { '1-3': { win: 0, total: 0 }, '4-6': { win: 0, total: 0 }, '7+': { win: 0, total: 0 } };
    rallyShots.forEach(s => {
        const count = s.points.length;
        let group = '7+';
        if (count <= 3) group = '1-3';
        else if (count <= 6) group = '4-6';
        
        rallyGroups[group].total++;
        if (s.isWin) rallyGroups[group].win++;
    });

    const rallyStats = Object.entries(rallyGroups).map(([name, data]) => ({
        name,
        total: data.total,
        winRate: data.total > 0 ? Math.round((data.win / data.total) * 100) : 0,
        displayLabel: `${data.total > 0 ? Math.round((data.win / data.total) * 100) : 0}% (${data.total}回)`
    }));

    const winningShotsFlat = rallyShots.filter(s => s.isWin && s.points.length > 0).map(s => s.points[s.points.length - 1])
    const winningTotals = winningShotsFlat.length
    const winningShotStats = SHOT_TYPES.map(type => {
        const count = winningShotsFlat.filter(p => p.id === type.id || p.label === type.label).length;
        const percent = winningTotals > 0 ? Math.round((count / winningTotals) * 100) : 0;
        const displayLabel = `${type.label} (${count}点)`;
        return { name: type.label, displayLabel, value: percent, count, fill: type.color.replace('bg-', '').replace('-400', '').replace('-500', '') }
    }).filter(s => s.count > 0).sort((a,b) => b.count - a.count)

    const colorMap = { 'fuchsia': '#e879f9', 'rose': '#f43f5e', 'sky': '#38bdf8', 'emerald': '#34d399', 'violet': '#a78bfa', 'cyan': '#22d3ee', 'amber': '#fbbf24' }
    winningShotStats.forEach(s => s.fill = colorMap[s.fill] || '#818cf8')

    const losingShotsFlat = rallyShots.filter(s => !s.isWin && s.points.length > 0).map(s => s.points[s.points.length - 1])
    const losingTotals = losingShotsFlat.length
    const losingShotStats = SHOT_TYPES.map(type => {
        const count = losingShotsFlat.filter(p => p.id === type.id || p.label === type.label).length;
        const percent = losingTotals > 0 ? Math.round((count / losingTotals) * 100) : 0;
        const displayLabel = `${type.label} (${count}点)`;
        return { name: type.label, displayLabel, value: percent, count, fill: type.color.replace('bg-', '').replace('-400', '').replace('-500', '') }
    }).filter(s => s.count > 0).sort((a,b) => b.count - a.count)
    losingShotStats.forEach(s => s.fill = colorMap[s.fill] || '#818cf8')

    const avgLength = rallyShots.length > 0 ? (allRallyPoints.length / rallyShots.length).toFixed(1) : 0

    // ラリー分析: 特定のショットで終わったラリー
    const rallyAnalysisRallies = rallyShots.filter(rally => {
        if (rally.points.length === 0) return false;
        const lastPoint = rally.points[rally.points.length - 1];
        const lastPointIdx = rally.points.length - 1;
        const firstPoint = rally.points[0];
        
        // 正規化された座標系 (自分=下) で判定
        // 1手目が y < 50 (相手側) なら自分がサーブ
        const selfServed = firstPoint.y < 50;
        // 奇数手目(index偶数)ならサーブ側、偶数手目(index奇数)ならレシーブ側
        const lastShotBySelf = selfServed ? (lastPointIdx % 2 === 0) : (lastPointIdx % 2 !== 0);
        
        const originMatch = lastShotOrigin === 'self' ? lastShotBySelf : !lastShotBySelf;
        return lastPoint.id === targetShot && originMatch;
    });

    return { totalRallies, avgLength, shotUsage, maxUsage, winningShotStats, losingShotStats, segments, winnerSegments, loserSegments, responses: responseMap, rallyStats, rallyAnalysisRallies }
  }

  const getShotInitial = (id) => {
    const mapping = { hairpin: 'Ha', smash: 'Sm', drop: 'Dp', clear: 'Cl', lob: 'Lo', drive: 'Dv', service: 'Sv' }
    return mapping[id] || id.substring(0, 2)
  }

  const stats = getStats()

  if (authLoading) return <div className="h-dvh flex items-center justify-center bg-[#020617] text-indigo-400">Loading...</div>

  if (!user) {
    return (
      <div className="h-dvh flex flex-col bg-[#020617] items-center justify-center p-8 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-rose-700/20 rounded-full blur-[120px]" />
        </div>
        <div className="z-10 text-center space-y-12 max-w-sm w-full">
          <div className="space-y-4">
            <div className="inline-block p-6 rounded-[2.5rem] bg-indigo-500/10 border border-indigo-500/20 mb-4">
              <ShuttleIcon size={64} className="text-indigo-400" />
            </div>
            <h1 className="text-4xl font-black italic text-white uppercase leading-none">Tactics<br />Shot</h1>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">バドミントン分析</p>
          </div>
          <div className="space-y-4">
            <button onClick={handleLogin} className="w-full bg-white text-slate-950 py-4 rounded-[2rem] font-black text-xs tracking-widest shadow-2xl transition-all active:scale-95">Googleでログイン</button>
            <button onClick={() => setUser({ uid: 'guest', guest: true })} className="w-full bg-slate-900 text-slate-400 py-4 rounded-[2rem] font-black text-xs tracking-widest transition-all active:scale-95 border border-slate-800">ログインせずにはじめる</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh flex flex-col bg-[#020617] text-slate-100 overflow-hidden select-none">
      <main className="flex-1 overflow-hidden relative max-w-md mx-auto w-full z-10 flex flex-col">
        {activeTab === 'rally' ? (
          <div className="h-full flex flex-col overflow-y-auto no-scrollbar">
            <div className="shrink-0 bg-slate-950/40 px-6 py-4 flex items-center justify-between border-b border-slate-800/40">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">セット {score.set}</span>
                  <button onClick={() => setShowHelpModal(true)} className="p-1 text-slate-600 hover:text-indigo-400 transition-colors"><HelpCircle size={14} /></button>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setScore(s => ({ ...s, set: Math.max(1, s.set - 1) }))} className="p-1 rounded bg-slate-800/40 text-slate-500"><Undo2 size={10} /></button>
                  <button onClick={() => setScore(s => ({ ...s, set: s.set + 1 }))} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black">+ NEXT SET</button>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScore(s => ({ ...s, self: Math.max(0, s.self - 1) }))} className="text-slate-700 hover:text-indigo-400 transition-colors"><Undo2 size={12} /></button>
                    <span className="text-3xl font-black italic text-white tabular-nums">{score.self}</span>
                    <button onClick={() => setScore(s => ({ ...s, self: s.self + 1 }))} className="text-slate-700 hover:text-indigo-400 transition-colors"><ChevronRight size={12} /></button>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">自分</span>
                </div>
                <div className="h-8 w-[1px] bg-slate-800" />
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setScore(s => ({ ...s, opponent: Math.max(0, s.opponent - 1) }))} className="text-slate-700 hover:text-rose-400 transition-colors"><Undo2 size={12} /></button>
                    <span className="text-3xl font-black italic text-white tabular-nums">{score.opponent}</span>
                    <button onClick={() => setScore(s => ({ ...s, opponent: s.opponent + 1 }))} className="text-slate-700 hover:text-rose-400 transition-colors"><ChevronRight size={12} /></button>
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase">相手</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 h-[50dvh] w-full flex items-center justify-center bg-slate-950/20 px-1 py-1">
              <BadmintonCourt
                onPointClick={handlePointClick}
                shots={shots}
                rallyPoints={rallyPoints}
                isWin={isWin}
                setIsWin={setIsWin}
                mode="rally"
                saveFlash={saveFlash}
                onSaveRally={saveRally}
                onShowSave={() => shots.length > 0 && setShowSaveModal(true)}
                isBottomSelf={isBottomSelf}
                onToggleSides={toggleSides}
              />
            </div>
            <div className="px-4 py-2 bg-slate-900/60 backdrop-blur-3xl rounded-t-[2rem] border-t border-slate-800/50 space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                {SHOT_TYPES.map(type => (
                  <button key={type.id} onClick={() => setSelectedType(type.id)} className={`py-2 rounded-xl text-[10px] font-black border transition-all ${selectedType === type.id ? `${type.color} text-slate-950 ${type.border} scale-[1.03]` : 'bg-slate-800/20 text-slate-500 border-slate-800/40'}`}>
                    {type.label}
                  </button>
                ))}
                <button onClick={undoShot} className="bg-slate-800/40 text-slate-400 py-2 rounded-xl border border-slate-700/20 flex items-center justify-center" title="1手戻す"><Undo2 size={16} /></button>
                <button 
                  onClick={resetRally} 
                  className={`py-2 rounded-xl border transition-all flex items-center justify-center font-black text-[10px] ${rallyPoints.length > 0 ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' : 'bg-slate-800/20 text-slate-600 border-slate-800/40 opacity-50'}`}
                  disabled={rallyPoints.length === 0}
                >
                  リセット
                </button>
                <button onClick={clearShots} className="bg-slate-800/40 text-rose-500/60 py-2 rounded-xl border border-slate-700/20 flex items-center justify-center" title="全削除"><Trash2 size={16} /></button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 text-center">
                  <h3 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mt-2">
                    {rallyPoints.length === 0 ? "" : `記録中 (${rallyPoints.length}手)`}
                  </h3>
                </div>
              </div>
              {rallyPoints.length > 0 && (
                <div className="flex gap-3">
                  <button onClick={() => saveRally('self')} className="flex-1 bg-indigo-600/90 py-3.5 rounded-2xl font-black text-[11px] shadow-lg shadow-indigo-500/20">得点（自分）</button>
                  <button onClick={() => saveRally('opponent')} className="flex-1 bg-rose-600/90 py-3.5 rounded-2xl font-black text-[11px] shadow-lg shadow-rose-500/20">得点（相手）</button>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'record' ? (
          <div className="h-full overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center mb-2 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  {selectedSessionIds.size} 件選択中
                </span>
                <button onClick={() => setShowHelpModal(true)} className="p-1 text-slate-600 hover:text-indigo-400 transition-colors"><HelpCircle size={14} /></button>
              </div>
               <div className="flex items-center gap-1.5 bg-slate-800/60 p-1 rounded-xl">
                <button 
                  onClick={() => setLogSortOrder('desc')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${logSortOrder === 'desc' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                >
                  新しい順
                </button>
                <button 
                  onClick={() => setLogSortOrder('asc')}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${logSortOrder === 'asc' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                >
                  古い順
                </button>
              </div>
              <button 
                onClick={() => viewReportForSessions(Array.from(selectedSessionIds))}
                disabled={selectedSessionIds.size === 0}
                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${selectedSessionIds.size > 0 ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 opacity-50'}`}
              >
                レポート
              </button>
            </div>
            {sessions.map(session => {
              const isSelected = selectedSessionIds.has(session.id);
              return (
                <div key={session.id} className={`bg-slate-900/40 border p-5 rounded-[2rem] space-y-4 transition-colors ${isSelected ? 'border-indigo-500/50' : 'border-slate-800/40'}`}>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSessionSelection(session.id)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 focus:ring-offset-0"
                      />
                      <span>{session.date}</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => openEditModal(session)} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Pencil size={14} /></button>
                      <button onClick={() => deleteSession(session.id)} className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Trash2 size={14} /></button>
                      <button onClick={() => { setShots(session.shots); setActiveTab('rally'); }} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><ChevronRight size={14} /></button>
                      <button onClick={() => viewReportForSessions([session.id])} className="p-2 bg-sky-500/10 text-sky-400 rounded-lg"><BarChart3 size={14} /></button>
                    </div>
                  </div>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-100 text-sm italic">{session.tournament || 'Unnamed Event'}</h3>
                      {session.score && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                            {session.score.self} - {session.score.opponent}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{session.date?.split(' ')[0]}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase">
                      <span className="text-indigo-400">{session.myName || 'ME'}</span>
                      <span className="opacity-30 text-[8px]">vs</span>
                      <div className="flex gap-1.5 items-center">
                        <span className="text-rose-400">{session.opponentTeam || 'OPP TEAM'}</span>
                        <span className="text-rose-500/60 text-[8px]">({session.opponentName || 'OPP'})</span>
                      </div>
                    </div>
                    {session.youtubeId ? (
                      <a 
                        href={`https://youtu.be/${session.youtubeId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 bg-rose-500/10 w-fit px-3 py-1.5 rounded-lg mt-2 transition-all hover:bg-rose-500/20"
                      >
                        <Youtube size={14} />
                        <span>動画を再生</span>
                      </a>
                    ) : (
                      <button 
                        onClick={() => setActiveUploadSessionId(session.id)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 bg-slate-800/40 w-fit px-3 py-1.5 rounded-lg mt-2 transition-all hover:bg-indigo-500/20 hover:text-indigo-400"
                      >
                        <Video size={14} />
                        <span>動画を追加</span>
                      </button>
                    )}
                  </div>
                  {activeUploadSessionId === session.id && (
                    <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-3">
                      <div className="flex gap-2 p-1 bg-slate-950/40 rounded-xl border border-slate-800/20">
                        <button 
                          onClick={() => setIsManualVideoInput(false)}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${!isManualVideoInput ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                        >
                          YouTubeへ直接投稿
                        </button>
                        <button 
                          onClick={() => setIsManualVideoInput(true)}
                          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black transition-all ${isManualVideoInput ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}
                        >
                          URLを手動入力
                        </button>
                      </div>

                      {isManualVideoInput ? (
                        <div className="space-y-3 p-3 bg-slate-800/20 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text" 
                              placeholder="YouTube URLを貼り付け" 
                              className="flex-1 bg-slate-950 px-4 py-3 rounded-xl text-[10px] font-bold outline-none border border-slate-700 focus:border-indigo-500"
                              value={manualVideoUrl}
                              onChange={(e) => setManualVideoUrl(e.target.value)}
                            />
                            <button 
                              onClick={async () => {
                                const vidMatch = manualVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([^?&]+)/)
                                if (vidMatch && vidMatch[1]) {
                                  const vid = vidMatch[1]
                                  if (user && !user.guest) {
                                    const sessionRef = doc(db, `users/${user.uid}/sessions`, session.id)
                                    await updateDoc(sessionRef, { youtubeId: vid })
                                  } else {
                                    const updated = sessions.map(s => s.id === session.id ? { ...s, youtubeId: vid } : s)
                                    setSessions(updated)
                                    localStorage.setItem('tactics_sessions', JSON.stringify(updated))
                                  }
                                  setActiveUploadSessionId(null)
                                  setManualVideoUrl('')
                                } else {
                                  alert('正しいYouTubeのURLを入力してください')
                                }
                              }}
                              className="bg-indigo-500 text-white p-3 rounded-xl hover:bg-indigo-400"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-500 italic px-1">URLを貼るだけならGoogleの警告は出ません。</p>
                        </div>
                      ) : (
                        <>
                          {!accessToken ? (
                            <div className="space-y-3">
                              <button onClick={handleLogin} className="w-full bg-rose-600/20 text-rose-400 py-3 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 border border-rose-500/30">
                                <Youtube size={16} />
                                YouTubeに連携してアップロード
                              </button>
                              <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                <p className="text-[9px] text-amber-500/80 leading-relaxed italic">
                                  <span className="font-black">※Googleの警告画面について:</span><br />
                                  [詳細]→[tactics-shot(安全ではない)に移動] を選んで進めます。
                                </p>
                              </div>
                            </div>
                          ) : (
                            <YouTubeUploader 
                              accessToken={accessToken}
                              metadata={{
                                date: session.date?.split(' ')[0] || '',
                                tournament: session.tournament || '',
                                myName: session.myName || '',
                                opponentTeam: session.opponentTeam || '',
                                opponentName: session.opponentName || ''
                              }}
                              onUploadComplete={async (vid) => {
                                if (user && !user.guest) {
                                  const sessionRef = doc(db, `users/${user.uid}/sessions`, session.id)
                                  await updateDoc(sessionRef, { youtubeId: vid })
                                } else {
                                  const updated = sessions.map(s => s.id === session.id ? { ...s, youtubeId: vid } : s)
                                  setSessions(updated)
                                  localStorage.setItem('tactics_sessions', JSON.stringify(updated))
                                }
                                setActiveUploadSessionId(null);
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
            {stats ? (
              <div className="space-y-8">
                <div className="bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/40 flex gap-1 overflow-x-auto no-scrollbar">
                    <button onClick={() => setAnalysisMode('total')} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'total' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>トータル</button>
                    <button onClick={() => setAnalysisMode('shot')} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'shot' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>ショット別</button>
                    <button onClick={() => setAnalysisMode('winner')} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'winner' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>決定打</button>
                    <button onClick={() => setAnalysisMode('loser')} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'loser' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>ミス</button>
                    <button onClick={() => { setAnalysisMode('rallyAnalysis'); setCurrentRallyIndex(0); }} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'rallyAnalysis' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>ラリー分析</button>
                    <button onClick={() => { setAnalysisMode('response'); if (!targetShot) setTargetShot('clear'); }} className={`shrink-0 px-3 py-2.5 rounded-xl text-[10px] font-black transition-all ${analysisMode === 'response' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>返球分析</button>
                    <button onClick={() => setShowHelpModal(true)} className="shrink-0 p-2 text-slate-500 hover:text-indigo-400 transition-colors"><HelpCircle size={18} /></button>
                </div>

                <div className="flex items-center justify-center gap-6 px-4 py-2 bg-slate-900/40 rounded-2xl border border-slate-800/20">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-black text-slate-300">自分ショット</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-[10px] font-black text-slate-300">相手ショット</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="h-[50dvh] w-full bg-slate-950/20 rounded-[2rem] overflow-hidden relative border border-slate-800/20">
                      <BadmintonCourt
                        mode="analysis"
                        analysisData={analysisMode === 'winner' ? stats.winnerSegments : analysisMode === 'loser' ? stats.loserSegments : stats.segments}
                        analysisMode={analysisMode}
                        targetShot={targetShot}
                        responsePoints={analysisMode === 'response' ? (stats.responses[responseOrigin === 'self' ? 'self' : 'opponent']?.[targetShot] || []) : []}
                        rallyAnalysisData={stats.rallyAnalysisRallies}
                        currentRallyIndex={currentRallyIndex}
                        isBottomSelf={true}
                        onSegmentClick={(segIdx) => setSelectedSegment(segIdx)}
                      />
                    </div>
                    {analysisMode === 'rallyAnalysis' && stats.rallyAnalysisRallies.length > 0 && (
                      <div className="flex items-center justify-between px-2 py-1 bg-slate-900/60 rounded-xl border border-slate-800/40">
                        <button 
                          onClick={() => setCurrentRallyIndex(prev => Math.max(0, prev - 1))}
                          className="p-2 text-indigo-400 disabled:opacity-30"
                          disabled={currentRallyIndex === 0}
                        >
                          <Undo2 size={16} className="rotate-90" />
                        </button>
                        <span className="text-[10px] font-black text-slate-300">
                          ラリー {currentRallyIndex + 1} / {stats.rallyAnalysisRallies.length}
                        </span>
                        <button 
                          onClick={() => setCurrentRallyIndex(prev => Math.min(stats.rallyAnalysisRallies.length - 1, prev + 1))}
                          className="p-2 text-indigo-400 disabled:opacity-30"
                          disabled={currentRallyIndex === stats.rallyAnalysisRallies.length - 1}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  
                  {analysisMode === 'response' && (
                    <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800/40">
                        <button onClick={() => setResponseOrigin('self')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${responseOrigin === 'self' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>自分ショットの返球</button>
                        <button onClick={() => setResponseOrigin('opponent')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${responseOrigin === 'opponent' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>相手ショットの返球</button>
                    </div>
                  )}
                  {analysisMode === 'rallyAnalysis' && (
                    <div className="flex gap-2 p-1 bg-slate-900/60 rounded-xl border border-slate-800/40">
                        <button onClick={() => { setLastShotOrigin('self'); setCurrentRallyIndex(0); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${lastShotOrigin === 'self' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>自分が撃った最後の一打</button>
                        <button onClick={() => { setLastShotOrigin('opponent'); setCurrentRallyIndex(0); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${lastShotOrigin === 'opponent' ? 'bg-indigo-500 text-white' : 'text-slate-500'}`}>相手が撃った最後の一打</button>
                    </div>
                  )}

                  {(analysisMode === 'shot' || analysisMode === 'response' || analysisMode === 'winner' || analysisMode === 'loser' || analysisMode === 'rallyAnalysis') && (
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
                            {analysisMode === 'response' ? '打ったショットを選択 ※このショットを打った後の返球が表示' : analysisMode === 'rallyAnalysis' ? '最後の一打を選択してラリーを特定' : '絞り込むショットを選択'}
                        </h4>
                        <div className="grid grid-cols-4 gap-1.5">
                            {SHOT_TYPES.map(type => (
                                <button key={type.id} onClick={() => setTargetShot(type.id)} className={`py-2 rounded-lg text-[9px] font-black border transition-all ${targetShot === type.id ? `${type.color} text-slate-950` : 'bg-slate-800/20 text-slate-500 border-slate-800/40'}`}>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-slate-800" />
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ショット使用割合 (自分 vs 相手)</span>
                    <div className="h-[1px] flex-1 bg-slate-800" />
                  </div>
                  <div className="bg-slate-900/40 p-2 rounded-[2rem] border border-slate-800/40 h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.shotUsage}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                        <PolarRadiusAxis 
                          angle={30} 
                          domain={[0, stats.maxUsage > 0 ? stats.maxUsage : 100]} 
                          tick={false} 
                          axisLine={false} 
                        />
                        <Radar name="自分ショット" dataKey="self" stroke="#818cf8" fill="#6366f1" fillOpacity={0.4} />
                        <Radar name="相手ショット" dataKey="opponent" stroke="#f43f5e" fill="#e11d48" fillOpacity={0.3} />
                        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-slate-800" />
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">得点ショット (決定打)</span>
                            <div className="h-[1px] flex-1 bg-slate-800" />
                        </div>
                        <div className="bg-slate-900/40 p-4 rounded-[2rem] border border-slate-800/40 h-64 pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.winningShotStats} layout="vertical" margin={{ left: -20, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} width={80} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.winningShotStats.map((entry, index) => (
                                            <Cell key={`cell-win-${index}`} fill={entry.fill} />
                                        ))}
                                        <LabelList dataKey="displayLabel" position="right" fill="#fff" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-slate-800" />
                            <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">失点ショット (ミス)</span>
                            <div className="h-[1px] flex-1 bg-slate-800" />
                        </div>
                        <div className="bg-slate-900/40 p-4 rounded-[2rem] border border-slate-800/40 h-64 pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.losingShotStats} layout="vertical" margin={{ left: -20, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} width={80} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                        {stats.losingShotStats.map((entry, index) => (
                                            <Cell key={`cell-loss-${index}`} fill={entry.fill} />
                                        ))}
                                        <LabelList dataKey="displayLabel" position="right" fill="#fff" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-[1px] flex-1 bg-slate-800" />
                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">ラリー数別 得点率</span>
                            <div className="h-[1px] flex-1 bg-slate-800" />
                        </div>
                        <div className="bg-slate-900/40 p-4 rounded-[2rem] border border-slate-800/40 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.rallyStats} layout="vertical" margin={{ left: -20, right: 30 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} width={80} />
                                    <Bar dataKey="winRate" radius={[0, 4, 4, 0]} barSize={30} fill="#fbbf24">
                                        <LabelList dataKey="displayLabel" position="right" fill="#fff" fontSize={10} fontWeight="bold" />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 space-y-4 pt-20">
                <BarChart3 size={48} />
                <p className="text-[10px] font-black tracking-widest uppercase">データがありません</p>
              </div>
            )}
          </div>
        )}

        <AnimatePresence>
          {showHelpModal && (
            <UsageGuide onClose={() => setShowHelpModal(false)} />
          )}

          {showSaveModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-end p-4">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-slate-900 w-full rounded-[3rem] p-8 border border-slate-800/60 space-y-6">
                <h3 className="font-black text-2xl tracking-tighter italic text-indigo-400 text-center uppercase">分析を保存</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-widest">対戦日</label>
                      <input type="date" value={metadata.date} onChange={e => setMetadata({ ...metadata, date: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50 text-slate-400" />
                    </div>
                    <input type="text" value={metadata.tournament} onChange={e => setMetadata({ ...metadata, tournament: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="大会名" />
                    <input type="text" value={metadata.myName} onChange={e => setMetadata({ ...metadata, myName: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="自分の名前" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={metadata.opponentTeam} onChange={e => setMetadata({ ...metadata, opponentTeam: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="対戦チーム名" />
                      <input type="text" value={metadata.opponentName} onChange={e => setMetadata({ ...metadata, opponentName: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="対戦相手" />
                    </div>
                  </div>

                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/50">
                    {!accessToken ? (
                      <button 
                        onClick={handleLogin}
                        className="w-full bg-rose-600/20 text-rose-400 py-4 rounded-2xl font-black text-[10px] flex items-center justify-center gap-2 border border-rose-500/30"
                      >
                        <Youtube size={18} />
                        YouTubeに連携して動画をアップロード
                      </button>
                    ) : (
                      <YouTubeUploader 
                        accessToken={accessToken}
                        metadata={metadata}
                        onUploadComplete={(vid) => setMetadata({ ...metadata, youtubeId: vid })}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={saveSession} className="w-full py-4 rounded-2xl text-[11px] font-black text-slate-950 bg-indigo-400">分析を保存する</button>
                  <button onClick={() => setShowSaveModal(false)} className="w-full py-4 rounded-2xl text-[11px] font-black text-slate-600">キャンセル</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showEditModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-end p-4">
              <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-slate-900 w-full rounded-[3rem] p-8 border border-slate-800/60 space-y-6">
                <h3 className="font-black text-2xl tracking-tighter italic text-indigo-400 text-center uppercase">名前を変更</h3>
                <div className="space-y-3">
                  <input type="text" value={editMetadata.tournament} onChange={e => setEditMetadata({ ...editMetadata, tournament: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="大会名" />
                  <input type="text" value={editMetadata.myName} onChange={e => setEditMetadata({ ...editMetadata, myName: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="自分の名前" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={editMetadata.opponentTeam} onChange={e => setEditMetadata({ ...editMetadata, opponentTeam: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="対戦チーム名" />
                    <input type="text" value={editMetadata.opponentName} onChange={e => setEditMetadata({ ...editMetadata, opponentName: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" placeholder="対戦相手" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-widest">自分のスコア</label>
                      <input type="number" value={editMetadata.selfScore} onChange={e => setEditMetadata({ ...editMetadata, selfScore: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 ml-4 uppercase tracking-widest">相手のスコア</label>
                      <input type="number" value={editMetadata.opponentScore} onChange={e => setEditMetadata({ ...editMetadata, opponentScore: e.target.value })} className="w-full bg-slate-950 px-5 py-4 rounded-2xl text-xs font-bold outline-none border border-slate-800/50" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={updateSessionMetadata} className="w-full py-4 rounded-2xl text-[11px] font-black text-slate-950 bg-indigo-400">更新を保存する</button>
                  <button onClick={() => setShowEditModal(false)} className="w-full py-4 rounded-2xl text-[11px] font-black text-slate-600">キャンセル</button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* セグメント詳細モーダル */}
          {selectedSegment !== null && stats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[110] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 w-full rounded-[2.5rem] p-6 border border-slate-800/60 space-y-4 text-slate-100">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">エリア {selectedSegment % 9 + 1} の詳細</h4>
                    <button onClick={() => setSelectedSegment(null)} className="p-2 text-slate-500 hover:text-white"><XCircle size={20} /></button>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(stats.segments[selectedSegment].shots).sort((a,b) => b[1] - a[1]).map(([sid, count]) => {
                        const type = SHOT_TYPES.find(t => t.id === sid);
                        const totalInSeg = Object.values(stats.segments[selectedSegment].shots).reduce((a,b) => a+b, 0);
                        const percent = Math.round((count / totalInSeg) * 100);
                        return (
                            <div key={sid} className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${type?.color || 'bg-slate-800'} text-slate-950`}>{getShotInitial(sid)}</div>
                                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${type?.color || 'bg-indigo-500'}`} style={{ width: `${percent}%` }} />
                                </div>
                                <div className="text-right min-w-[60px]">
                                    <span className="text-sm font-black italic">{count}</span>
                                    <span className="text-[10px] font-bold text-slate-500 ml-1">({percent}%)</span>
                                </div>
                            </div>
                        )
                    })}
                    {Object.keys(stats.segments[selectedSegment].shots).length === 0 && (
                        <p className="text-center text-[10px] text-slate-600 py-10">配球データがありません</p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="shrink-0 bg-slate-950/60 backdrop-blur-3xl border-t border-slate-800/20 pb-safe z-30 flex items-center justify-between px-1">
        <NavItem icon={<Target size={20} />} label="ラリー" active={activeTab === 'rally'} onClick={() => setActiveTab('rally')} />
        <NavItem icon={<History size={20} />} label="ログ" active={activeTab === 'record'} onClick={() => setActiveTab('record')} />
        <NavItem icon={<BarChart3 size={20} />} label="レポート" active={activeTab === 'results'} onClick={() => setActiveTab('results')} />
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 py-3 px-2 text-slate-600 flex-1">
          <span className="text-[8px] font-black text-rose-500/60 uppercase">終了</span>
          <div className="p-2 rounded-xl bg-rose-500/5"><LogOut size={18} className="text-rose-500/60" /></div>
        </button>
      </nav>
    </div>
  )
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 py-3 px-2 transition-all min-w-0 flex-1 ${active ? 'text-indigo-400' : 'text-slate-600'}`}>
      <span className="text-[8px] font-black tracking-widest uppercase">{label}</span>
      <div className={`p-2 rounded-xl ${active ? 'bg-indigo-500/10' : ''}`}>{icon}</div>
    </button>
  )
}

export default App
