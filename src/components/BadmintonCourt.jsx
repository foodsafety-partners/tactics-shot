import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Save, RefreshCw } from 'lucide-react'

export default function BadmintonCourt({ 
    onPointClick, 
    shots = [], 
    showHeatMap = false, 
    isWin, 
    setIsWin, 
    rallyPoints = [], 
    mode = 'normal', 
    saveFlash = null, 
    onSaveRally, 
    onShowSave, 
    isBottomSelf = true, 
    onToggleSides,
    analysisData = [],
    analysisMode = 'total',
    targetShot = 'smash',
    responsePoints = [],
    rallyAnalysisData = [],
    currentRallyIndex = 0,
    onSegmentClick
}) {
    const containerRef = useRef(null)
    const [courtSize, setCourtSize] = useState({ width: 0, height: 0 })

    const RATIO = 6.1 / 13.4

    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                const parent = containerRef.current.parentElement
                if (!parent) return

                const { width: pWidth, height: pHeight } = parent.getBoundingClientRect()

                // 左右のボタン用スペースを確保
                const availableWidth = mode === 'analysis' ? pWidth : pWidth - 90
                let width = availableWidth
                let height = width / RATIO

                if (height > pHeight) {
                    height = pHeight
                    width = height * RATIO
                }

                setCourtSize({ width, height })
            }
        }
        updateSize()
        const observer = new ResizeObserver(updateSize)
        if (containerRef.current?.parentElement) {
            observer.observe(containerRef.current.parentElement)
        }
        window.addEventListener('resize', updateSize)
        return () => {
            window.removeEventListener('resize', updateSize)
            observer.disconnect()
        }
    }, [RATIO, mode])

    const handleClick = (e) => {
        if (!containerRef.current || mode === 'analysis') return
        const rect = containerRef.current.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onPointClick({ x, y })
    }

    const SHOT_INIT = { hairpin: 'Ha', smash: 'Sm', drop: 'Dp', clear: 'Cl', lob: 'Lo', drive: 'Dv', service: 'Sv' };
    const SHOT_COLORS = { hairpin: 'bg-fuchsia-400', smash: 'bg-rose-500', drop: 'bg-sky-400', clear: 'bg-emerald-400', lob: 'bg-violet-400', drive: 'bg-cyan-400', service: 'bg-amber-400' };

    const getHexColor = (bgClass) => {
        const map = {
            'bg-rose-500': '#f43f5e',
            'bg-indigo-500': '#6366f1',
            'bg-emerald-400': '#34d399',
            'bg-sky-400': '#38bdf8',
            'bg-violet-400': '#a78bfa',
            'bg-fuchsia-400': '#e879f9',
            'bg-amber-400': '#fbbf24',
            'bg-cyan-400': '#22d3ee'
        };
        return map[bgClass] || '#818cf8';
    };

    const renderSegment = (segIdx) => {
        const seg = analysisData[segIdx];
        if (!seg) return null;

        const isUpper = segIdx < 9;
        const isSelfSide = isBottomSelf ? isUpper : !isUpper;

        if (analysisMode === 'response') return null;

        if (analysisMode === 'total') {
            const sortedShots = Object.entries(seg.shots).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const totalInSeg = Object.values(seg.shots).reduce((a, b) => a + b, 0);
            
            // ヒートマップ: 全セグメントの中での相対的な多さを背景色で表現
            const allSegCounts = analysisData.map(s => Object.values(s.shots).reduce((a, b) => a + b, 0));
            const maxCount = Math.max(...allSegCounts, 1);
            const intensity = totalInSeg / maxCount;
            const bgColor = totalInSeg > 0 ? (isSelfSide ? `rgba(99, 102, 241, ${intensity * 0.3})` : `rgba(244, 63, 94, ${intensity * 0.3})`) : '';

            return (
                <div key={segIdx} onClick={() => onSegmentClick?.(segIdx)} className="w-full h-full border border-white/5 flex flex-col items-center justify-center p-0.5 gap-0.5 relative active:bg-white/5 transition-colors cursor-pointer group" style={{ backgroundColor: bgColor }}>
                    {sortedShots.map(([sid, count]) => (
                        <div key={sid} className="w-full flex items-center gap-1">
                            <span className="text-[7px] font-black text-white/40 w-3 leading-none">{SHOT_INIT[sid]}</span>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full ${SHOT_COLORS[sid]}`} style={{ width: `${(count / totalInSeg) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                    {totalInSeg > 0 && <span className="absolute bottom-0.5 right-1 text-[6px] font-black text-white/20">{totalInSeg}</span>}
                </div>
            )
        } else if (analysisMode === 'winner' || analysisMode === 'loser') {
            const isWinnerMode = analysisMode === 'winner';
            // targetShotが指定されている場合はそのショットのみ、そうでない場合は全ショット
            const count = targetShot ? (seg.shots[targetShot] || 0) : Object.values(seg.shots).reduce((a, b) => a + b, 0);
            const allSegCounts = analysisData.map(s => targetShot ? (s.shots[targetShot] || 0) : Object.values(s.shots).reduce((a, b) => a + b, 0));
            const maxCount = Math.max(...allSegCounts, 1);
            const intensity = count / maxCount;
            
            return (
                <div key={segIdx} onClick={() => onSegmentClick?.(segIdx)} className="w-full h-full border border-white/5 flex items-center justify-center relative active:bg-white/5 transition-colors cursor-pointer group" style={{ backgroundColor: count > 0 ? (isWinnerMode ? `rgba(99, 102, 241, ${intensity * 0.4})` : `rgba(244, 63, 94, ${intensity * 0.4})`) : '' }}>
                    {count > 0 && <span className="text-[10px] font-black text-white drop-shadow-sm">{count}</span>}
                    {targetShot && count > 0 && <span className="absolute top-1 right-1 text-[6px] font-black text-white/40">{SHOT_INIT[targetShot]}</span>}
                </div>
            )
        } else {
            const count = seg.shots[targetShot] || 0;
            const allSegsForShot = analysisData.map(s => s.shots[targetShot] || 0);
            const maxCount = Math.max(...allSegsForShot, 1);
            const intensity = count / maxCount;
            return (
                <div key={segIdx} onClick={() => onSegmentClick?.(segIdx)} className="w-full h-full border border-white/5 flex items-center justify-center relative active:bg-white/5 transition-colors cursor-pointer group" style={{ backgroundColor: count > 0 ? (isSelfSide ? `rgba(99, 102, 241, ${intensity * 0.4})` : `rgba(244, 63, 94, ${intensity * 0.4})`) : '' }}>
                    {count > 0 && <span className="text-[10px] font-black text-white drop-shadow-sm">{count}</span>}
                </div>
            )
        }
    }

    return (
        <div className="flex items-center gap-2 w-full h-full justify-center px-2 relative overflow-hidden">
            <AnimatePresence>
                {saveFlash && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className={`absolute inset-0 z-50 pointer-events-none ${saveFlash === 'self' ? 'bg-indigo-500' : 'bg-rose-500'}`} />
                )}
            </AnimatePresence>

            {mode !== 'analysis' && (
                <div className="flex-none flex flex-col gap-2 h-full justify-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (mode === 'rally' && rallyPoints.length > 0) onSaveRally?.('self'); else setIsWin(true); }}
                        className={`h-32 w-11 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 overflow-hidden shadow-2xl ${isWin ? 'bg-indigo-500/40 border-indigo-400 text-white shadow-indigo-500/20' : 'bg-slate-800/20 border-slate-700/40 text-slate-500'}`}
                    >
                        <span className="text-[11px] font-black tracking-[0.4em] pointer-events-none" style={{ writingMode: 'vertical-rl' }}>自分の得点</span>
                    </button>
                </div>
            )}

            <div
                className="relative bg-[#064e4b] border-[3px] border-[#065f5b] touch-none cursor-crosshair shadow-2xl shrink-0 overflow-hidden"
                style={{ width: courtSize.width, height: courtSize.height }}
                ref={containerRef}
                onClick={handleClick}
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff20_1px,_transparent_1px)] bg-[size:10px_10px]" />

                {/* 集約された自分・相手ラベル（中央寄せ修正） */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex flex-col items-center justify-around py-[10%]">
                    <div className={`font-black tracking-[0.2em] text-[2.5rem] whitespace-nowrap opacity-10 select-none ${isBottomSelf ? 'text-rose-400' : 'text-indigo-400'}`}>
                        {isBottomSelf ? '相手' : '自分'}
                    </div>
                    <div className={`font-black tracking-[0.2em] text-[2.5rem] whitespace-nowrap opacity-10 select-none ${isBottomSelf ? 'text-indigo-400' : 'text-rose-400'}`}>
                        {isBottomSelf ? '自分' : '相手'}
                    </div>
                </div>

                {/* 入れ替えボタン（ネット付近、ラリー開始前のみ） - 削除して外部へ移動 */}

                <div className="absolute border-[2px] border-white/90 inset-0 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-[7.5%] border-r-[2px] border-white/70 pointer-events-none" />
                <div className="absolute top-0 bottom-0 right-[7.5%] border-l-[2px] border-white/70 pointer-events-none" />
                <div className="absolute left-0 right-0 top-[5.7%] border-t-[2px] border-white/70 pointer-events-none" />
                <div className="absolute left-0 right-0 bottom-[5.7%] border-b-[2px] border-white/70 pointer-events-none" />
                <div className="absolute left-0 right-0 top-[35.2%] border-t-[2px] border-white/90 pointer-events-none" />
                <div className="absolute left-0 right-0 bottom-[35.2%] border-b-[2px] border-white/90 pointer-events-none" />
                <div className="absolute top-0 bottom-[35.2%] left-1/2 -translate-x-1/2 border-r-[2px] border-white/90 pointer-events-none" />
                <div className="absolute bottom-0 top-[35.2%] left-1/2 -translate-x-1/2 border-r-[2px] border-white/90 pointer-events-none" />
                <div className="absolute left-[0%] right-[0%] top-1/2 -translate-y-1/2 h-[1px] bg-indigo-400/50 shadow-[0_0_8px_rgba(99,102,241,0.4)] z-20 pointer-events-none" />

                {mode === 'analysis' ? (
                    <div className="absolute inset-0 z-30 pointer-events-auto flex flex-col">
                        <div className="flex-1 grid grid-cols-3 grid-rows-3">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => renderSegment(i))}
                        </div>
                        <div className="flex-1 grid grid-cols-3 grid-rows-3 border-t-2 border-indigo-400/30">
                            {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(i => renderSegment(i))}
                        </div>
                        
                        {analysisMode === 'rallyAnalysis' && (
                            <div className="absolute inset-0 pointer-events-none z-40">
                                {rallyAnalysisData.map((rally, ridx) => {
                                    const isSelected = ridx === currentRallyIndex;
                                    return (
                                        <svg key={`analysis-rally-${ridx}`} className="absolute inset-0 w-full h-full">
                                            <defs>
                                                <marker id={`arrow-head-${ridx}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                                    <polygon points="0 0, 10 3.5, 0 7" fill={isSelected ? (rally.winner === 'self' ? '#818cf8' : '#fb7185') : 'rgba(255,255,255,0.1)'} opacity={isSelected ? 1 : 0.2} />
                                                </marker>
                                            </defs>
                                            {rally.points.map((p, i) => i < rally.points.length - 1 && (
                                                <line 
                                                    key={`l-${ridx}-${i}`} 
                                                    x1={`${p.x}%`} y1={`${p.y}%`} 
                                                    x2={`${rally.points[i + 1].x}%`} y2={`${rally.points[i + 1].y}%`} 
                                                    stroke={isSelected ? (rally.winner === 'self' ? '#818cf8' : '#fb7185') : 'rgba(255,255,255,0.2)'} 
                                                    strokeWidth={isSelected ? 3 : 1} 
                                                    strokeDasharray={isSelected ? "" : "2 2"}
                                                    markerEnd={i === rally.points.length - 2 ? `url(#arrow-head-${ridx})` : ''} 
                                                    opacity={isSelected ? 0.9 : 0.2}
                                                />
                                            ))}
                                            {isSelected && rally.points.map((p, i) => (
                                                <g key={`pt-${ridx}-${i}`}>
                                                    <circle 
                                                        cx={`${p.x}%`} cy={`${p.y}%`} r="6" 
                                                        fill={isSelected ? (getHexColor(SHOT_COLORS[p.id])) : 'rgba(255,255,255,0.1)'} 
                                                        className="stroke-white stroke-[1px]"
                                                    />
                                                    <text 
                                                        x={`${p.x}%`} y={`${p.y}%`} 
                                                        dy="2.5" textAnchor="middle" 
                                                        className="text-[6px] font-black fill-white select-none"
                                                    >
                                                        {i === 0 ? 'S' : i}
                                                    </text>
                                                    <text 
                                                        x={`${p.x}%`} y={`${p.y}%`} 
                                                        dy="-8" textAnchor="middle" 
                                                        className="text-[5px] font-black fill-white/80 select-none"
                                                    >
                                                        {SHOT_INIT[p.id]}
                                                    </text>
                                                </g>
                                            ))}
                                        </svg>
                                    );
                                })}
                            </div>
                        )}

                        {analysisMode === 'response' && (
                            <svg className="absolute inset-0 pointer-events-none z-40 w-full h-full">
                                <defs>
                                    {responsePoints.map((p, i) => (
                                        <marker key={`head-${i}`} id={`head-${i}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                            <polygon points="0 0, 8 3, 0 6" fill={getHexColor(SHOT_COLORS[p.id])} />
                                        </marker>
                                    ))}
                                </defs>
                                {responsePoints.map((p, i) => (
                                    <g key={`traj-${i}`}>
                                        <line 
                                            x1={`${p.startX}%`} y1={`${p.startY}%`} 
                                            x2={`${p.endX}%`} y2={`${p.endY}%`} 
                                            stroke={getHexColor(SHOT_COLORS[p.id])} 
                                            strokeWidth="1.5" strokeDasharray="4 2" markerEnd={`url(#head-${i})`} opacity="0.8" 
                                        />
                                        <circle cx={`${p.startX}%`} cy={`${p.startY}%`} r="2.5" fill="#fff" opacity="0.6" />
                                        <text x={`${p.endX}%`} y={`${p.endY}%`} dy="-8" textAnchor="middle" className="text-[6px] font-black fill-white opacity-80" stroke="#000" strokeWidth="0.2">
                                            {SHOT_INIT[p.id]}
                                        </text>
                                    </g>
                                ))}
                            </svg>
                        )}
                    </div>
                ) : (
                    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                        <AnimatePresence mode="wait">
                            {!showHeatMap ? (
                                <motion.div key="markers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                    {shots.flatMap(s => s.type === 'rally' ? [] : [s]).filter(s => s.x !== undefined && s.y !== undefined).map(shot => (
                                        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} key={`shot-${shot.id}`} className={`absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border border-white/30 z-10 flex items-center justify-center ${shot.color}`} style={{ left: `${shot.x}%`, top: `${shot.y}%` }}>
                                            {shot.isWin ? <div className="w-1 h-1 bg-white rounded-full" /> : <span className="text-white text-[8px] font-black">×</span>}
                                        </motion.div>
                                    ))}
                                    {shots.filter(s => s.type === 'rally').map(rally => (
                                        <svg key={`rally-path-${rally.id}`} className="absolute inset-0 w-full h-full pointer-events-none z-0">
                                            <defs>
                                                <marker id={`arrowhead-${rally.id}`} markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                                                    <polygon points="0 0, 10 3.5, 0 7" fill={rally.winner === 'self' ? '#818cf8' : '#fb7185'} />
                                                </marker>
                                            </defs>
                                            {rally.points.map((p, i) => i < rally.points.length - 1 && (
                                                <line key={`rally-${rally.id}-line-${i}`} x1={`${p.x}%`} y1={`${p.y}%`} x2={`${rally.points[i + 1].x}%`} y2={`${rally.points[i + 1].y}%`} stroke={rally.winner === 'self' ? '#818cf8' : '#fb7185'} strokeWidth="2" strokeDasharray="4 2" markerEnd={i === rally.points.length - 2 ? `url(#arrowhead-${rally.id})` : ''} opacity="0.6" />
                                            ))}
                                            {rally.points.map((p, i) => (
                                                <circle key={`rally-${rally.id}-pt-${i}`} cx={`${p.x}%`} cy={`${p.y}%`} r="3" fill={p.color?.replace('bg-', '#') || (rally.winner === 'self' ? '#818cf8' : '#fb7185')} opacity="0.8" />
                                            ))}
                                        </svg>
                                    ))}
                                    {rallyPoints.map((p, i) => (
                                        <motion.div key={`rally-p-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border border-white shadow-xl flex items-center justify-center font-black text-[7px] z-[60] ${p.color || 'bg-indigo-500'} text-white`} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                                            {i === 0 ? 'S' : i}
                                        </motion.div>
                                    ))}
                                    {rallyPoints.length >= 2 && (
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-50">
                                            {rallyPoints.map((p, i) => i < rallyPoints.length - 1 && (
                                                <line key={`temp-rally-line-${i}`} x1={`${p.x}%`} y1={`${p.y}%`} x2={`${rallyPoints[i + 1].x}%`} y2={`${rallyPoints[i + 1].y}%`} stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" className="animate-pulse" />
                                            ))}
                                        </svg>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                                    {shots.flatMap(s => s.type === 'rally' ? s.points : [s]).filter(s => s.x !== undefined && s.y !== undefined).map((shot, i) => (
                                        <div key={`heat-${shot.id || i}`} className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full blur-xl ${shot.color?.replace('bg-', 'bg-opacity-40 bg-') || 'bg-indigo-500 bg-opacity-40'} z-0`} style={{ left: `${shot.x}%`, top: `${shot.y}%` }} />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {mode !== 'analysis' && (
                <div className="flex-none flex flex-col gap-2 h-full justify-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); if (mode === 'rally' && rallyPoints.length > 0) onSaveRally?.('opponent'); else setIsWin(false); }}
                        className={`h-32 w-11 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 overflow-hidden shadow-2xl ${!isWin ? 'bg-rose-500/40 border-rose-400 text-white shadow-rose-500/20' : 'bg-slate-800/20 border-slate-700/40 text-slate-500'}`}
                    >
                        <span className="text-[11px] font-black tracking-[0.4em] pointer-events-none" style={{ writingMode: 'vertical-rl' }}>相手の得点</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onShowSave?.(); }} disabled={shots.length === 0} className={`w-11 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border border-slate-700/40 bg-slate-900 inline-flex ${shots.length > 0 ? 'text-indigo-400 opacity-100' : 'text-slate-700 opacity-50'}`}>
                        <Save size={14} />
                        <span className="text-[8px] font-black mt-1" style={{ writingMode: 'vertical-rl' }}>試合ログ</span>
                    </button>
                    {mode === 'rally' && rallyPoints.length === 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onToggleSides?.(); }}
                            className="w-11 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 border border-slate-700/40 bg-slate-900 text-amber-400 shadow-lg active:scale-95"
                            title="サイドを入れ替え"
                        >
                            <RefreshCw size={14} />
                            <span className="text-[8px] font-black mt-1" style={{ writingMode: 'vertical-rl' }}>サイド</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
