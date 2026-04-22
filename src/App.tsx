/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Zap, 
  Radio, 
  Globe, 
  Activity, 
  Cpu, 
  Lock, 
  Terminal, 
  Eye,
  Crosshair,
  TrendingUp,
  MessageSquareCode,
  Radar,
  Server,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOracleBriefing, getRealTimeIntel } from './services/geminiService';
import { aegisCron } from './services/cron';

// --- TYPES ---
interface IntelLog {
  id: string;
  source: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  location: { lat: number; lng: number };
}

export default function App() {
  const [logs, setLogs] = useState<IntelLog[]>([]);
  const [threatLevel, setThreatLevel] = useState(14.2);
  const [predictiveScore, setPredictiveScore] = useState(25.0);
  const [oracleActive, setOracleActive] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [activeTab, setActiveTab] = useState<'INTEL' | 'MAP' | 'SYSTEM'>('MAP');
  
  const [currentAlert, setCurrentAlert] = useState<IntelLog | null>(null);
  const [selectedLog, setSelectedLog] = useState<IntelLog | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  const mapRef = useRef<HTMLDivElement>(null);

  // Request Notification Permission
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Helper: Play Alert Sound
  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio Context blocked or unsupported");
    }
  };

  // Helper: Trigger Browser Notification
  const sendBrowserNotification = (log: IntelLog) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`AEGIS CRITICAL ALERT`, {
        body: `${log.source}: ${log.message}`,
        icon: '/favicon.ico',
      });
    }
  };

  // Helper: Project coordinates to container %
  const projectToMap = (lat: number, lng: number) => {
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x, y };
  };

  useEffect(() => {
    aegisCron.start();
    import { useEffect } from "react";
import { aegisCron } from "./services/cron";
    const unsubscribe = aegisCron.subscribe((realIntel) => {
      if (realIntel && realIntel.length > 0) {
        // Check for high severity in new items
        const highSeverityItems = realIntel.filter((item: any) => 
          item.severity === 'CRITICAL' || item.severity === 'HIGH'
        );
        
        if (highSeverityItems.length > 0) {
          const primaryAlert = {
            ...highSeverityItems[0],
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          };
          setCurrentAlert(primaryAlert);
          playAlertSound();
          sendBrowserNotification(primaryAlert);
        }

        setLogs(prev => {
          const newLogs = realIntel.map((item: any) => ({
            ...item,
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          }));
          const combined = [...newLogs, ...prev].slice(0, 30);
          
          const score = combined.reduce((acc, log) => {
            const weights = { CRITICAL: 15, HIGH: 8, MEDIUM: 4, LOW: 2 };
            return acc + (weights[log.severity as keyof typeof weights] || 0);
          }, 0);
          setPredictiveScore(Math.min(100, Math.max(10, score * 0.8)));
          
          return combined;
        });
        setLastSync(new Date().toLocaleTimeString());
        setThreatLevel(prev => Math.min(100, Math.max(5, prev + (Math.random() > 0.5 ? 2.5 : -1.5))));
      }
    });

    return () => {
      unsubscribe();
      aegisCron.stop();
    };
  }, []);

  const handleOracleRequest = async () => {
    setLoadingBriefing(true);
    setOracleActive(true);
    const context = logs.slice(0, 3).map(l => l.message).join(". ");
    const result = await getOracleBriefing(context);
    setBriefing(result);
    setLoadingBriefing(false);
  };

  return (
    <div className="h-screen w-screen bg-aegis-bg flex flex-col overflow-hidden cyber-grid font-sans selection:bg-aegis-cyan selection:text-black">
      <div className="scanline" />
      
      {/* ALERTS SYSTEM */}
      <AnimatePresence>
        {currentAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md"
          >
            <div className={`p-4 glass-card border-2 shadow-[0_0_30px_rgba(255,0,0,0.2)] flex flex-col gap-2 ${
              currentAlert.severity === 'CRITICAL' ? 'border-aegis-red bg-aegis-red/10' : 'border-aegis-amber bg-aegis-amber/10'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 animate-pulse ${currentAlert.severity === 'CRITICAL' ? 'text-aegis-red' : 'text-aegis-amber'}`} />
                  <span className="text-xs font-mono font-bold tracking-[0.3em] text-white uppercase italic">
                    {currentAlert.severity}_PRIORITY_ALERT
                  </span>
                </div>
                <button onClick={() => setCurrentAlert(null)} className="text-white/40 hover:text-white p-1">
                  <Lock className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs font-mono text-white tracking-widest leading-relaxed">
                {currentAlert.message}
              </p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] font-mono text-white/60">SOURCE: {currentAlert.source}</span>
                <button 
                  onClick={() => { setSelectedLog(currentAlert); setCurrentAlert(null); }}
                  className="px-3 py-1 bg-white/10 text-[9px] font-mono text-white hover:bg-white/20 uppercase tracking-widest"
                >
                  Analyze &gt;&gt;
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedLog && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] w-[90vw] max-w-lg glass-card border-aegis-cyan/30 p-6 flex flex-col gap-4 shadow-[0_0_50px_rgba(0,240,255,0.1)]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-aegis-cyan" />
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tighter uppercase">Intel Deep Analysis</h3>
                    <p className="text-[9px] font-mono text-aegis-cyan tracking-widest uppercase">Target_Vector_{selectedLog.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-white/5 rounded transition-transform hover:rotate-90">
                  <Lock className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2 bg-black/40 border border-white/5">
                    <p className="text-[8px] text-slate-500 mb-1">SEVERITY</p>
                    <p className={`font-bold ${
                      selectedLog.severity === 'CRITICAL' ? 'text-aegis-red' :
                      selectedLog.severity === 'HIGH' ? 'text-aegis-amber' : 'text-aegis-cyan'
                    }`}>{selectedLog.severity}</p>
                  </div>
                  <div className="p-2 bg-black/40 border border-white/5">
                    <p className="text-[8px] text-slate-500 mb-1">SOURCE</p>
                    <p className="text-white">{selectedLog.source}</p>
                  </div>
                </div>

                <div className="p-3 bg-black/60 border border-white/5 rounded">
                  <p className="text-[8px] text-slate-500 mb-2">RAW_MESSAGE_CONTENT</p>
                  <p className="text-white leading-relaxed text-sm italic">"{selectedLog.message}"</p>
                </div>

                <div className="p-3 bg-black/40 border border-white/5">
                  <p className="text-[8px] text-slate-500 mb-2">GEOSPATIAL_FIX</p>
                  <div className="flex justify-between items-center text-aegis-cyan">
                    <span>LAT: {selectedLog.location.lat.toFixed(4)}</span>
                    <span>LNG: {selectedLog.location.lng.toFixed(4)}</span>
                    <MapPin className="w-3 h-3" />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-between items-center opacity-40 italic">
                  <span className="text-[8px]">TIMESTAMP: {selectedLog.timestamp}</span>
                  <span className="text-[8px]">AEGIS_SECURE_EXTRACT</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* 1. TOP NAV - REFINED FOR RESPONSIVENESS */}
      <header className="h-14 border-b border-aegis-cyan/10 glass-card z-30 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-aegis-cyan" />
            <h1 className="text-sm md:text-lg font-bold tracking-tighter text-white">AEGIS <span className="text-aegis-cyan">INTEL</span></h1>
          </div>
          <div className="h-4 w-px bg-slate-800 hidden xs:block" />
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">Global_Senses_Secure</span>
            </div>
          </div>
        </div>

        {/* MOBILE NAV TABS */}
        <nav className="flex lg:hidden bg-black/40 border border-white/5 rounded p-0.5 gap-0.5">
          <button 
            onClick={() => setActiveTab('INTEL')}
            className={`px-3 py-1 rounded text-[8px] font-mono transition-all ${activeTab === 'INTEL' ? 'bg-aegis-cyan text-black' : 'text-slate-500'}`}
          >
            INTEL
          </button>
          <button 
            onClick={() => setActiveTab('MAP')}
            className={`px-3 py-1 rounded text-[8px] font-mono transition-all ${activeTab === 'MAP' ? 'bg-aegis-cyan text-black' : 'text-slate-500'}`}
          >
            MAP
          </button>
          <button 
            onClick={() => setActiveTab('SYSTEM')}
            className={`px-3 py-1 rounded text-[8px] font-mono transition-all ${activeTab === 'SYSTEM' ? 'bg-aegis-cyan text-black' : 'text-slate-500'}`}
          >
            SYS
          </button>
        </nav>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">Last Ingestion</p>
            <p className="text-[10px] font-mono text-aegis-cyan leading-none">{lastSync}</p>
          </div>
          <button 
            onClick={() => setOracleActive(true)}
            className="px-3 md:px-6 py-1.5 bg-aegis-cyan/10 border border-aegis-cyan/30 text-aegis-cyan text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-aegis-cyan hover:text-black transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.1)]"
          >
            Oracle
          </button>
        </div>
      </header>

      {/* 2. COMMAND GRID - RESPONSIVE TABS & GRID */}
      <main className="flex-1 flex p-1 md:p-2 gap-1 md:gap-2 overflow-hidden min-h-0 w-full relative">
        
        {/* LEFT: INTEL STREAM */}
        <section className={`
          flex flex-col gap-2 shrink-0 min-w-0 transition-all duration-300
          ${activeTab === 'INTEL' ? 'flex-1 translate-x-0' : 'hidden lg:flex lg:w-72 xl:w-80'}
        `}>
          <div className="flex-1 glass-card p-3 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Radio className="w-3 h-3 text-aegis-cyan" />
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-[0.2em]">Intel Stream</span>
              </div>
              <button onClick={() => aegisCron.start()} className="p-1 hover:bg-white/5 rounded transition-colors group">
                <Radar className="w-3 h-3 text-slate-600 group-hover:text-aegis-cyan" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
              <AnimatePresence mode="popLayout">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                    <div className="w-8 h-8 border-2 border-slate-700 border-t-aegis-cyan rounded-full animate-spin" />
                    <span className="text-[8px] font-mono text-center tracking-widest uppercase">Connecting...</span>
                  </div>
                ) : (
                  logs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedLog(log)}
                      className={`p-2 bg-slate-900/40 border border-slate-800/10 border-l-2 transition-all hover:bg-slate-900/60 cursor-pointer group active:scale-[0.98] ${
                        log.severity === 'CRITICAL' ? 'border-l-aegis-red' :
                        log.severity === 'HIGH' ? 'border-l-aegis-amber' : 'border-l-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-[7px] font-mono font-bold px-1 rounded uppercase ${
                          log.severity === 'CRITICAL' ? 'text-aegis-red bg-aegis-red/10' :
                          log.severity === 'HIGH' ? 'text-aegis-amber bg-aegis-amber/10' : 'text-aegis-cyan bg-aegis-cyan/10'
                        }`}>
                          {log.source}:{log.severity}
                        </span>
                        <span className="text-[7px] font-mono text-slate-600 group-hover:text-aegis-cyan transition-colors">{log.timestamp}</span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-300 leading-tight uppercase font-medium line-clamp-2">
                        {log.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="h-28 md:h-32 glass-card p-3 flex flex-col gap-2 shrink-0">
             <div className="flex items-center gap-2">
               <TrendingUp className="w-3 h-3 text-aegis-amber" />
               <span className="text-[9px] font-mono text-white uppercase font-bold tracking-widest">Prediction_Log</span>
             </div>
             <div className="flex-1 flex items-end gap-1 px-1">
               {Array.from({ length: 15 }).map((_, i) => (
                 <motion.div 
                  key={i} 
                  animate={{ height: [`${20 + Math.random() * 60}%`, `${40 + Math.random() * 40}%`, `${20 + Math.random() * 60}%`] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
                  className="flex-1 bg-aegis-amber/30 rounded-t-xs" 
                 />
               ))}
             </div>
          </div>
        </section>

        {/* CENTER: PRIMARY GEOINT */}
        <section className={`
          flex flex-col gap-2 min-w-0 min-h-0 overflow-hidden relative transition-all duration-300
          ${activeTab === 'MAP' ? 'flex-1' : 'hidden lg:flex-1 lg:flex'}
        `}>
          <div ref={mapRef} className="flex-1 glass-card relative overflow-hidden group min-h-0 border-aegis-cyan/20">
            {/* GRID OVERLAY */}
            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none z-10" />
            
            {/* REAL-TIME MAP OVERLAYS */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              <AnimatePresence>
                {logs.map((log) => {
                  const { x, y } = projectToMap(log.location.lat, log.location.lng);
                  const color = log.severity === 'CRITICAL' ? 'var(--color-aegis-red)' :
                                log.severity === 'HIGH' ? 'var(--color-aegis-amber)' : 'var(--color-aegis-cyan)';
                  return (
                    <motion.div
                      key={`ping-${log.id}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                    >
                      <motion.div 
                        animate={{ scale: [1, 3], opacity: [0.6, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ backgroundColor: color }}
                        className="absolute inset-0 w-8 md:w-12 h-8 md:h-12 -ml-4 -mt-4 md:-ml-6 md:-mt-6 rounded-full opacity-20"
                      />
                      <div style={{ backgroundColor: color }} className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* HUD */}
            <div className="absolute inset-0 p-3 md:p-4 flex flex-col justify-between pointer-events-none z-30">
              <div className="flex justify-between items-start">
                <div className="p-2 glass-card bg-black/40 border-aegis-cyan/30">
                  <p className="text-[7px] font-mono text-aegis-cyan uppercase mb-1 tracking-[0.4em]">Geo_Spatial_Aegis</p>
                  <p className="text-[10px] md:text-xs font-mono text-white font-bold tracking-widest uppercase">Grid_Active</p>
                </div>
              </div>

              {/* RETICLE */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 md:w-40 h-32 md:h-40 border border-white/5 flex items-center justify-center">
                 <motion.div 
                   animate={{ rotate: 360 }} 
                   transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                   className="absolute inset-0 rounded-full border border-dashed border-aegis-cyan/20" 
                 />
                 <Crosshair className="w-5 h-5 text-aegis-cyan/30" />
              </div>

              <div className="flex justify-between items-end">
                <div className="flex gap-1 md:gap-2">
                  <div className="p-2 md:p-3 glass-card bg-black/60 border-slate-700">
                    <span className="block text-[6px] md:text-[7px] text-slate-500 uppercase tracking-widest mb-1 leading-none">Impact</span>
                    <span className={`text-base md:text-2xl font-mono leading-none ${threatLevel > 60 ? 'text-aegis-red' : 'text-aegis-cyan'}`}>
                      {threatLevel.toFixed(1)}%
                    </span>
                  </div>
                  <div className="p-2 md:p-3 glass-card bg-black/60 border-aegis-amber/30">
                    <span className="block text-[6px] md:text-[7px] text-aegis-amber uppercase tracking-widest mb-1 leading-none">Predictive</span>
                    <span className="text-base md:text-2xl font-mono leading-none text-white">
                      {predictiveScore.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* MAP CONTENT */}
            <div className="absolute inset-0 bg-slate-950">
               <img 
                src="https://picsum.photos/seed/global-tactical/1920/1080?grayscale&blur=2" 
                className="w-full h-full object-cover opacity-10 grayscale scale-110" 
                alt="Tactical Map"
                referrerPolicy="no-referrer"
               />
            </div>
          </div>

          {/* LOWER ANALYSIS */}
          <div className="h-28 md:h-32 flex gap-1 md:gap-2 shrink-0 overflow-hidden">
             <div className="flex-1 glass-card p-3 flex flex-col justify-between border-slate-800/40">
               <div className="flex items-center gap-2">
                 <Cpu className="w-3 h-3 text-aegis-cyan" />
                 <span className="text-[9px] font-mono text-white uppercase font-bold tracking-widest">Chronos</span>
               </div>
               <div className="flex-1 flex flex-col justify-center gap-1 md:gap-2">
                 <div className="flex justify-between items-center text-[9px] md:text-[10px] font-mono">
                    <span className="text-slate-500">Synapse_Rate</span>
                    <span className="text-white font-bold italic">4.2M/S</span>
                 </div>
                 <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                    animate={{ width: ["10%", "95%", "35%", "75%", "90%"] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-full bg-aegis-cyan shadow-[0_0_10px_var(--color-aegis-cyan)]" 
                   />
                 </div>
                 <p className="text-[7px] text-slate-600 font-mono tracking-widest uppercase truncate">Processing_Entropy...</p>
               </div>
             </div>
             
             <div className="flex-1 hidden md:flex glass-card p-3 flex flex-col justify-between border-aegis-red/10">
               <div className="flex items-center gap-2">
                 <Server className="w-3 h-3 text-aegis-red" />
                 <span className="text-[9px] font-mono text-white uppercase font-bold tracking-widest">Sentinel</span>
               </div>
               <div className="flex-1 flex flex-col justify-center gap-2">
                 <div className="flex justify-between items-center text-[9px] font-mono">
                   <span className="text-slate-500">Integrity</span>
                   <span className="text-aegis-cyan">99.98%</span>
                 </div>
                 <div className="p-1.5 bg-aegis-red/5 border border-aegis-red/10 rounded flex items-center justify-between text-[8px] font-mono">
                    <span className="text-slate-400 font-bold">&gt; MESH_ROTATING</span>
                 </div>
               </div>
             </div>
          </div>
        </section>

        {/* RIGHT: SYSTEM & NEURAL */}
        <section className={`
          flex flex-col gap-2 shrink-0 min-w-0 transition-all duration-300
          ${activeTab === 'SYSTEM' ? 'flex-1 translate-x-0' : 'hidden lg:flex lg:w-64 xl:w-72'}
        `}>
          <div className="flex-1 glass-card p-3 flex flex-col min-h-0 border-slate-800/20">
             <div className="flex items-center gap-2 mb-3 shrink-0">
               <Activity className="w-3 h-3 text-aegis-cyan" />
               <span className="text-[9px] font-mono text-white uppercase font-bold tracking-widest">Neural_Link</span>
             </div>
             
             {/* DEPLOYMENT READINESS CONTROLS */}
             <div className="mb-2 p-2 bg-aegis-cyan/5 border border-aegis-cyan/20 rounded space-y-2">
                <p className="text-[7px] font-mono text-aegis-cyan uppercase tracking-widest leading-none">Deployment_Status: READY</p>
                <div className="grid grid-cols-2 gap-1">
                   <button 
                     onClick={requestNotificationPermission}
                     className={`py-1 text-[7px] font-mono border transition-all ${
                       notificationPermission === 'granted' ? 'border-green-500/30 text-green-500 bg-green-500/10' : 'border-aegis-cyan/30 text-aegis-cyan'
                     }`}
                   >
                     {notificationPermission === 'granted' ? '✓_NOTIF_ON' : 'ENABLE_NOTIF'}
                   </button>
                   <button 
                     onClick={playAlertSound}
                     className="py-1 text-[7px] font-mono border border-aegis-cyan/30 text-aegis-cyan hover:bg-aegis-cyan/20"
                   >
                     TEST_SIGNAL
                   </button>
                </div>
             </div>

             <div className="flex-1 bg-black/60 p-2 font-mono text-[8px] text-aegis-cyan/60 space-y-1.5 overflow-hidden border border-white/5 rounded">
                <div className="text-white border-b border-aegis-cyan/10 pb-1 flex justify-between uppercase font-bold">
                   <span>SHELL_v.4.2</span>
                   <span className="text-aegis-amber">BUSY</span>
                </div>
                <div className="space-y-0.5 py-1">
                  <p>&gt; BOOTING_OMNI...</p>
                  <p>&gt; LINKING_SAT_MESH... OK</p>
                  <p>&gt; SCAN_DARK_SENT... OK</p>
                  <AnimatePresence>
                    {logs.slice(0, 4).map(l => (
                      <p key={l.id} className="text-white truncate">&gt; INGEST: {l.source}</p>
                    ))}
                  </AnimatePresence>
                </div>
                <div className="pt-2 border-t border-aegis-cyan/5">
                  <p className="animate-pulse text-white font-bold">&gt; READY_FOR_COMMAND_</p>
                </div>
             </div>
          </div>

          <div className="h-36 md:h-40 glass-card p-3 flex flex-col gap-2 shrink-0 overflow-hidden">
             <div className="flex items-center gap-2 mb-1">
               <Radar className="w-3 h-3 text-slate-500" />
               <span className="text-[9px] font-mono text-white uppercase font-bold tracking-widest">Nodes</span>
             </div>
             <div className="grid grid-cols-4 gap-1.5 flex-1 p-2 bg-black/20 rounded">
               {Array.from({ length: 8 }).map((_, i) => (
                 <div key={i} className="flex flex-col gap-1 items-center">
                    <motion.div 
                      animate={{ backgroundColor: ["rgba(0,240,255,0.1)", "rgba(0,240,255,0.6)", "rgba(0,240,255,0.1)"] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-full h-full rounded-[1px] border border-aegis-cyan/5" 
                    />
                    <span className="text-[6px] font-mono text-slate-700">N_{i+1}</span>
                 </div>
               ))}
             </div>
          </div>
        </section>

      </main>

      {/* 3. ORACLE OVERLAY */}
      <AnimatePresence>
        {oracleActive && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOracleActive(false)}
              className="fixed inset-0 bg-black/95 backdrop-blur-xl z-40"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[90vw] max-w-2xl h-[85vh] sm:h-[80vh] bg-aegis-card/90 border border-aegis-cyan/30 z-50 p-4 md:p-8 flex flex-col gap-4 md:gap-6 shadow-[0_0_100px_rgba(0,240,255,0.1)] rounded-sm"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-aegis-cyan/10 rounded border border-aegis-cyan/40">
                    <MessageSquareCode className="w-5 h-5 md:w-6 md:h-6 text-aegis-cyan" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-xl font-bold text-white uppercase tracking-tighter">Strategic Oracle</h2>
                    <p className="text-[8px] md:text-[9px] font-mono text-aegis-cyan tracking-[0.4em] uppercase italic">Briefing_Session</p>
                  </div>
                </div>
                <button onClick={() => setOracleActive(false)} className="text-slate-600 hover:text-white transition-colors p-2">
                  <Lock className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 scrollbar-hide">
                {!briefing && !loadingBriefing ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-6 md:gap-8">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-dashed border-aegis-cyan/30 flex items-center justify-center animate-spin-slow">
                      <Radar className="w-6 h-6 md:w-8 md:h-8 text-aegis-cyan/40" />
                    </div>
                    <div className="space-y-3 md:space-y-4">
                       <p className="text-slate-400 font-mono text-[10px] md:text-xs italic leading-relaxed max-w-sm">
                         "Synthesizing global signals into precise executable pathways."
                       </p>
                    </div>
                    <button 
                      onClick={handleOracleRequest}
                      className="px-8 md:px-12 py-2.5 md:py-3 bg-aegis-cyan text-black font-bold uppercase text-[9px] md:text-[10px] tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_40px_rgba(0,240,255,0.2)]"
                    >
                      Process
                    </button>
                  </div>
                ) : (
                  <div className="font-mono text-[10px] md:text-xs leading-loose text-slate-300">
                    {loadingBriefing ? (
                      <div className="space-y-3 md:space-y-4 py-8">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <motion.div 
                            key={i} animate={{ opacity: [0.1, 0.4, 0.1], x: [0, 5, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                            className="h-3 bg-aegis-cyan/5 w-full rounded-sm" 
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="whitespace-pre-wrap selection:bg-aegis-cyan selection:text-black bg-black/30 p-4 md:p-6 rounded border border-white/5"
                      >
                        {briefing}
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. FOOTER */}
      <footer className="h-8 border-t border-slate-900 bg-black/60 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex gap-4 md:gap-6 text-[8px] font-mono text-slate-600 uppercase tracking-[0.3em]">
           <div className="flex items-center gap-1.5 md:gap-2">
             <div className="w-1 h-1 bg-aegis-cyan rounded-full" />
             NODE_A1
           </div>
           <div className="hidden xs:flex items-center gap-2">
             <span className="text-aegis-amber">LOAD:OK</span>
           </div>
        </div>
        <div className="flex gap-4 text-[8px] font-mono text-slate-700">
          <span className="tracking-widest uppercase">System_Clock: {new Date().getFullYear()}.AEGIS</span>
          <span className="text-slate-800 tracking-[0.6em] font-normal uppercase hidden md:block">SCIENTIA EST PRAESIDIUM</span>
        </div>
      </footer>
    </div>
  );
}

