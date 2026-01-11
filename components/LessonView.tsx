import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  LessonContent, Subject, ClassLevel, Chapter, 
  MCQItem, ContentType, User, SystemSettings 
} from '../types';
import { 
  ArrowLeft, Clock, AlertTriangle, ExternalLink, CheckCircle, 
  XCircle, Trophy, BookOpen, Play, Lock, ChevronRight, 
  ChevronLeft, Save, X, Maximize, RotateCcw, Share2, Youtube, Download
} from 'lucide-react';
import { CustomConfirm, CustomAlert } from './CustomDialogs';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { decodeHtml } from '../utils/htmlDecoder';

interface Props {
  content: LessonContent | null;
  subject: Subject;
  classLevel: ClassLevel;
  chapter: Chapter;
  loading: boolean;
  onBack: () => void;
  onMCQComplete?: (count: number, answers: Record<number, number>, usedData: MCQItem[], timeTaken: number) => void; 
  user?: User; 
  onUpdateUser?: (user: User) => void;
  settings?: SystemSettings;
}

export const LessonView: React.FC<Props> = ({ 
  content, 
  subject, 
  classLevel, 
  chapter,
  loading, 
  onBack,
  onMCQComplete,
  user,
  onUpdateUser,
  settings
}) => {
  // ==========================================
  // 1. STATES & INITIALIZATION
  // ==========================================
  const [mcqState, setMcqState] = useState<Record<number, number | null>>({});
  const [showResults, setShowResults] = useState(false);
  const [localMcqData, setLocalMcqData] = useState<MCQItem[]>([]);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [analysisUnlocked, setAnalysisUnlocked] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [sessionTime, setSessionTime] = useState(0); 
  const [batchIndex, setBatchIndex] = useState(0);
  const BATCH_SIZE = 50; 
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // ==========================================
  // 2. HELPER FUNCTIONS (DOWNLOAD & SECURITY)
  // ==========================================
  
  // Permission Checker
  const checkDownloadPermission = (contentType: 'VIDEO' | 'PDF', isUltra: boolean) => {
      if (!user || !user.subscriptionPlan) return false;

      const plan = user.subscriptionPlan.toUpperCase();
      
      // 1. Weekly & Monthly: NO DOWNLOADS
      if (plan === 'WEEKLY' || plan === 'MONTHLY') return false;

      // 2. 3 Months: Normal Video & PDF OK, Ultra NO
      if (plan === 'QUARTERLY' || plan === '3_MONTHS' || plan === '3 MONTHS') {
          if (contentType === 'VIDEO' && isUltra) return false;
          return true; 
      }

      // 3. 1 Year & Lifetime: ALL OK
      if (plan === 'YEARLY' || plan === 'LIFETIME' || plan === '1_YEAR' || plan === '1 YEAR') {
          return true;
      }

      return false;
  };

  // Robust Drive Link Generator
  const getDriveDownloadLink = (url: string) => {
      // Find ID using Regex (Works for all link types)
      const idMatch = url.match(/[-\w]{25,}/); 
      return idMatch ? `https://drive.google.com/u/0/uc?id=${idMatch[0]}&export=download` : null;
  };

  // Nuclear Event Killer
  const killEvent = (e: any) => {
      e.stopPropagation();
      e.preventDefault();
      if(e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
      return false;
  };

  // ==========================================
  // 3. EFFECTS
  // ==========================================
  useEffect(() => {
      let interval: any;
      if (!showResults && !showSubmitModal && !showResumePrompt) {
          interval = setInterval(() => {
              setSessionTime(prev => prev + 1);
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [showResults, showSubmitModal, showResumePrompt]);

  const toggleFullScreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(err => {
              console.error("Fullscreen Error:", err);
              setAlertConfig({ isOpen: true, message: "Fullscreen not supported on this device." });
          });
      } else {
          document.exitFullscreen();
      }
  };

  useEffect(() => {
      if (content?.type.includes('MCQ') && Object.keys(mcqState).length > 0 && !showResults) {
          const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
          window.addEventListener('beforeunload', handleBeforeUnload);
          return () => window.removeEventListener('beforeunload', handleBeforeUnload);
      }
  }, [mcqState, content?.type, showResults]);

  // ==========================================
  // 4. RENDERERS
  // ==========================================

  if (loading) {
      return (
          <div className="h-[80vh] flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm">
              <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-8 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-8 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 animate-pulse tracking-tight">Syncing Content...</h3>
          </div>
      );
  }

  // --- AI NOTES RENDERER ---
  if (content?.type === 'NOTES_IMAGE_AI') {
      const preventAction = (e: React.MouseEvent | React.TouchEvent) => e.preventDefault();
      if (content.aiHtmlContent) {
          const decodedHtml = decodeHtml(content.aiHtmlContent);
          return (
              <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
                  <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 p-4 absolute top-0 left-0 right-0 z-10 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600"><BookOpen size={20} /></div>
                          <div><h2 className="text-sm font-black text-slate-800">{content.title}</h2><p className="text-[10px] text-teal-600 font-bold uppercase">AI Master Notes</p></div>
                      </div>
                      <button onClick={onBack} className="p-3 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                  </header>
                  <div className="flex-1 overflow-y-auto w-full pt-20 pb-10 px-6 md:px-12 selection:bg-teal-100">
                      <div className="prose prose-slate max-w-none" dangerouslySetInnerHTML={{ __html: decodedHtml }} />
                  </div>
              </div>
          );
      }
      return (
          <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col overflow-hidden animate-in fade-in" style={{ width: '100vw', height: '100vh', touchAction: 'none' }}>
              <header className="bg-black/60 backdrop-blur-2xl border-b border-white/5 p-4 absolute top-0 left-0 right-0 z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3"><button onClick={onBack} className="p-2 text-white/50 hover:text-white"><ArrowLeft size={20} /></button><h2 className="text-xs font-black text-white/90 uppercase">{content.title}</h2></div>
                  <div className="px-3 py-1 bg-teal-500/20 rounded-full text-teal-400 text-[9px] font-black uppercase">AI Visual Mode</div>
              </header>
              <div className="viewer w-full h-full overflow-y-auto bg-[#050505]" onContextMenu={preventAction}>
                  <div className="pt-24 pb-20 w-full min-h-screen flex justify-center"><img src={content.content} alt="AI Notes" className="w-[160%] ml-[-30%]" draggable={false} /></div>
              </div>
          </div>
      );
  }

  // --- MCQ RENDERER ---
  if ((content?.type === 'MCQ_ANALYSIS' || content?.type === 'MCQ_SIMPLE') && content.mcqData) {
      useEffect(() => {
          if (!content.mcqData) return;
          if (content.userAnswers) { setMcqState(content.userAnswers as any); setShowResults(true); setAnalysisUnlocked(true); setLocalMcqData(content.mcqData); return; }
          const saved = localStorage.getItem(`nst_mcq_progress_${chapter.id}`);
          if (saved) { setShowResumePrompt(true); setLocalMcqData([...content.mcqData].sort(() => Math.random() - 0.5)); } 
          else { setLocalMcqData([...content.mcqData].sort(() => Math.random() - 0.5)); }
      }, [content.mcqData, chapter.id, content.userAnswers]);

      useEffect(() => {
          if (!showResults && Object.keys(mcqState).length > 0) localStorage.setItem(`nst_mcq_progress_${chapter.id}`, JSON.stringify({ mcqState, batchIndex, localMcqData }));
      }, [mcqState, batchIndex, chapter.id, localMcqData, showResults]);

      const handleResume = () => {
          const saved = JSON.parse(localStorage.getItem(`nst_mcq_progress_${chapter.id}`) || '{}');
          setMcqState(saved.mcqState || {}); setBatchIndex(saved.batchIndex || 0);
          if (saved.localMcqData) setLocalMcqData(saved.localMcqData);
          setShowResumePrompt(false);
      };
      const handleRestart = () => { localStorage.removeItem(`nst_mcq_progress_${chapter.id}`); setMcqState({}); setBatchIndex(0); setLocalMcqData([...content.mcqData].sort(() => Math.random() - 0.5)); setShowResumePrompt(false); setShowResults(false); };
      
      const currentBatchData = localMcqData.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
      const score = Object.keys(mcqState).reduce((acc, key) => acc + (mcqState[parseInt(key)] === localMcqData[parseInt(key)].correctAnswer ? 1 : 0), 0);
      const attemptedCount = Object.keys(mcqState).length;
      const canSubmit = attemptedCount >= Math.min(50, localMcqData.length);

      const handleConfirmSubmit = () => { setShowSubmitModal(false); localStorage.removeItem(`nst_mcq_progress_${chapter.id}`); if (onMCQComplete) onMCQComplete(score, mcqState as any, localMcqData, sessionTime); };

      return (
          <div className="flex flex-col h-full bg-slate-50 animate-in fade-in relative">
               <CustomAlert isOpen={alertConfig.isOpen} message={alertConfig.message} type="ERROR" onClose={() => setAlertConfig({...alertConfig, isOpen: false})} />
               <CustomConfirm isOpen={confirmConfig.isOpen} title={confirmConfig.title} message={confirmConfig.message} onConfirm={confirmConfig.onConfirm} onCancel={() => setConfirmConfig({...confirmConfig, isOpen: false})} />
               {showResumePrompt && !showResults && (
                   <div className="absolute inset-0 z-50 bg-slate-900/80 flex items-center justify-center p-4">
                       <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
                           <h3 className="text-xl font-black mb-4">Resume Session?</h3>
                           <div className="flex gap-3"><button onClick={handleResume} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Resume</button><button onClick={handleRestart} className="w-full py-3 border rounded-xl font-bold">Restart</button></div>
                       </div>
                   </div>
               )}
               {showSubmitModal && (
                   <div className="fixed inset-0 z-[100] bg-slate-900/80 flex items-center justify-center p-4">
                       <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center">
                           <h3 className="text-xl font-black mb-4">Submit Test?</h3>
                           <div className="flex gap-3"><button onClick={() => setShowSubmitModal(false)} className="flex-1 py-3 border rounded-xl font-bold">Cancel</button><button onClick={handleConfirmSubmit} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold">Submit</button></div>
                       </div>
                   </div>
               )}
               <div className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
                   <div className="flex gap-2"><button onClick={onBack} className="flex items-center gap-2 font-bold text-slate-600"><ArrowLeft size={18} /> Exit</button></div>
                   <div className="text-right"><h3 className="font-black text-sm">MCQ Test</h3><span className="text-xs text-slate-400">{attemptedCount}/{localMcqData.length} Attempted</span></div>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full pb-32 mcq-container">
                   {currentBatchData.map((q, localIdx) => {
                       const idx = (batchIndex * BATCH_SIZE) + localIdx;
                       const userAnswer = mcqState[idx];
                       return (
                           <div key={idx} className="bg-white p-6 rounded-2xl border shadow-sm">
                               <h4 className="font-bold mb-4 flex gap-3"><span className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center text-xs shrink-0">{idx + 1}</span>{q.question}</h4>
                               <div className="space-y-3">{q.options.map((opt, oIdx) => (
                                   <button key={oIdx} disabled={userAnswer !== undefined || showResults} onClick={() => setMcqState(p => ({...p, [idx]: oIdx}))} className={`w-full text-left p-3 rounded-xl border font-medium ${showResults ? (oIdx === q.correctAnswer ? 'bg-green-100 border-green-500' : (userAnswer === oIdx ? 'bg-red-100 border-red-500' : 'opacity-50')) : (userAnswer === oIdx ? 'bg-blue-600 text-white' : 'hover:bg-slate-50')}`}>{opt}</button>
                               ))}</div>
                               {showResults && <div className="mt-4 p-4 bg-slate-50 rounded-xl text-sm"><span className="font-bold block mb-1">Explanation:</span>{q.explanation}</div>}
                           </div>
                       );
                   })}
               </div>
               <div className="p-4 bg-white border-t sticky bottom-0 z-[60] flex gap-3">
                   {batchIndex > 0 && <button onClick={() => setBatchIndex(p => p - 1)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">Prev</button>}
                   {!showResults ? <button onClick={() => setShowSubmitModal(true)} disabled={!canSubmit} className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold disabled:bg-slate-300">Submit</button> : <button onClick={onBack} className="flex-[2] py-3 bg-slate-900 text-white rounded-xl font-bold">Exit</button>}
                   {(batchIndex + 1) * BATCH_SIZE < localMcqData.length && <button onClick={() => setBatchIndex(p => p + 1)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold">Next</button>}
               </div>
          </div>
      );
  }

  // ==========================================
  // 6. VIDEO RENDERER (FIXED GOOGLE DRIVE + YOUTUBE + DOWNLOAD)
  // ==========================================
  if ((content.type === 'PDF_VIEWER' || content.type === 'VIDEO_LECTURE') && (content.content.includes('youtube.com') || content.content.includes('youtu.be') || content.content.includes('drive.google.com') || content.content.includes('.mp4') || (content.videoPlaylist && content.videoPlaylist.length > 0))) {
      const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
      const playlist = content.videoPlaylist && content.videoPlaylist.length > 0 
          ? content.videoPlaylist 
          : [{ title: chapter.title, url: content.content }];
      
      const currentVideo = playlist[currentVideoIndex];
      let embedUrl = currentVideo.url;
      let downloadUrl: string | null = null;
      let isDriveVideo = false;
      let isYouTubeVideo = false;

      // Permission Check
      const isUltraContent = content.title.toLowerCase().includes('ultra') || (content.tags && content.tags.includes('ultra'));
      const canDownload = checkDownloadPermission('VIDEO', !!isUltraContent);

      // --- ADVANCED URL PARSER (THE FIX) ---
      if (embedUrl.includes('drive.google.com')) {
          isDriveVideo = true;
          // Extract ID using Regex (Handles all link types: view, open, etc)
          const idMatch = embedUrl.match(/[-\w]{25,}/);
          if (idMatch) {
              embedUrl = `https://drive.google.com/file/d/${idMatch[0]}/preview`;
              if (canDownload) {
                  downloadUrl = `https://drive.google.com/u/0/uc?id=${idMatch[0]}&export=download`;
              }
          }
      } 
      else if (embedUrl.includes('youtube.com') || embedUrl.includes('youtu.be')) {
          isYouTubeVideo = true;
          // Regex for YouTube ID extraction
          const ytMatch = embedUrl.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=))([\w-]{11})/);
          if (ytMatch) {
              embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
          }
          downloadUrl = null; 
      }

      // Secure Source for YouTube
      const secureSrc = isYouTubeVideo 
          ? `${embedUrl}&modestbranding=1&rel=0&iv_load_policy=3&controls=1&disablekb=1&showinfo=0&fs=0`
          : embedUrl;

      return (
          <div className="flex flex-col h-[calc(100vh-80px)] bg-[#030712] animate-in fade-in">
              {/* HEADER */}
              <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-white/10 shadow-lg relative z-[10000]">
                   <button onClick={onBack} className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-white transition-colors group">
                       <ArrowLeft size={20} className="group-active:-translate-x-1 transition-transform" /> Back
                   </button>
                   <div className="text-center">
                       <h3 className="font-black text-white text-xs sm:text-sm truncate max-w-[200px] uppercase tracking-tighter">{currentVideo.title}</h3>
                       {isUltraContent && <span className="text-[9px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/50 font-bold uppercase tracking-widest mt-0.5">ULTRA</span>}
                   </div>
                   
                   {/* DOWNLOAD BUTTON */}
                   {canDownload && downloadUrl ? (
                       <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-600/20 text-green-400 border border-green-600/50 rounded-lg hover:bg-green-600 hover:text-white transition-all" title="Download Video">
                           <Download size={18} />
                       </a>
                   ) : (
                       <div className="w-8"></div>
                   )}
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                  <div ref={containerRef} className="flex-1 bg-black relative group overflow-hidden select-none isolate">
                      
                      {/* --- YOUTUBE SECURITY --- */}
                      {isYouTubeVideo && (
                          <>
                              {/* Top Right (Share Blocker) */}
                              <div style={{ position: 'absolute', top: 0, right: 0, width: '250px', height: '120px', zIndex: 2147483647, backgroundColor: 'rgba(255, 255, 255, 0.001)', touchAction: 'none' }} onClickCapture={killEvent} onTouchStartCapture={killEvent} />
                              {/* Bottom Right (Logo Redirect) */}
                              <a href="https://youtube.com/@ehsansir2.0?si=80l2sFqj85RnGulA" target="_blank" rel="noopener noreferrer" style={{ position: 'absolute', bottom: 0, right: 0, width: '180px', height: '80px', zIndex: 2147483647, backgroundColor: 'rgba(255, 255, 255, 0.001)', cursor: 'pointer', touchAction: 'auto' }} />
                              {/* Bottom Left (Controls Blocker) */}
                              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '80px', zIndex: 2147483646, backgroundColor: 'rgba(255, 255, 255, 0.001)', touchAction: 'none' }} onClickCapture={killEvent} onTouchStartCapture={killEvent} />
                          </>
                      )}

                      {/* --- GOOGLE DRIVE SECURITY --- */}
                      {isDriveVideo && (
                          <>
                              {/* Top Right Blocker (Pop-out button) */}
                              <div 
                                style={{ position: 'absolute', top: 0, right: 0, width: '100px', height: '80px', zIndex: 2147483647, backgroundColor: 'rgba(255, 255, 255, 0.001)', touchAction: 'none' }} 
                                onClickCapture={killEvent} onTouchStartCapture={killEvent}
                                onContextMenu={(e) => e.preventDefault()}
                              />
                          </>
                      )}

                      {/* 🔘 FULLSCREEN BUTTON */}
                      <button 
                          onClick={toggleFullScreen} 
                          className="absolute top-4 left-4 z-[2147483647] bg-black/60 text-white/90 p-3 rounded-2xl backdrop-blur-md border border-white/10 hover:bg-black hover:text-white transition-all shadow-xl active:scale-90"
                      >
                          <Maximize size={22} />
                      </button>

                      {/* 📺 VIDEO IFRAME */}
                      <iframe 
                           key={secureSrc}
                           src={secureSrc}
                           className="w-full h-full border-0 relative"
                           style={{ zIndex: 1 }}
                           allow="autoplay; fullscreen; picture-in-picture"
                           allowFullScreen
                           sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
                           title={currentVideo.title}
                       />
                  </div>
                  
                  {/* Playlist Sidebar */}
                  {playlist.length > 1 && (
                      <div className="w-full md:w-85 bg-slate-950 border-l border-white/5 flex flex-col shadow-2xl z-[50]">
                          <div className="p-4 bg-slate-950 border-b border-white/5"><h4 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.3em]">Playlist</h4></div>
                          <div className="flex-1 overflow-y-auto p-3 space-y-3">
                              {playlist.map((vid, idx) => (
                                  <button key={idx} onClick={() => setCurrentVideoIndex(idx)} className={`w-full p-4 rounded-2xl flex gap-4 items-center text-left transition-all duration-300 border ${idx === currentVideoIndex ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/50 border-transparent text-slate-500 hover:bg-slate-900'}`}>
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${idx === currentVideoIndex ? 'bg-white/20 text-white' : 'bg-slate-800'}`}>{idx + 1}</div>
                                      <div className="flex-1 min-w-0"><p className="font-bold text-xs truncate uppercase tracking-tight">{vid.title}</p></div>
                                      {idx === currentVideoIndex && <Play size={14} fill="currentColor" />}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }
  
  // ==========================================
  // 7. PDF VIEWER (WITH DOWNLOAD LOGIC)
  // ==========================================
  if (content.type === 'PDF_VIEWER' || content.type === 'PDF_FREE' || content.type === 'PDF_PREMIUM') {
      const isPdf = content.content.toLowerCase().endsWith('.pdf') || content.content.includes('drive.google.com') || content.content.includes('docs.google.com');
      
      const canDownloadPdf = checkDownloadPermission('PDF', false); 
      let pdfDownloadLink = null;

      // Extract Drive ID correctly for PDF
      if (content.content.includes('drive.google.com') && canDownloadPdf) {
          const idMatch = content.content.match(/[-\w]{25,}/);
          if (idMatch) pdfDownloadLink = `https://drive.google.com/u/0/uc?id=${idMatch[0]}&export=download`;
      } else if (canDownloadPdf) {
          pdfDownloadLink = content.content;
      }

      return (
          <div className="flex flex-col h-[calc(100vh-80px)] bg-slate-50">
              <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
                   <div className="flex items-center gap-3">
                       <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold text-sm hover:text-slate-900 transition-colors"><ArrowLeft size={20} /></button>
                       <h3 className="font-black text-slate-800 text-sm truncate max-w-[200px] uppercase tracking-tighter">{chapter.title}</h3>
                   </div>
                   
                   <div className="flex items-center gap-2">
                       {canDownloadPdf && pdfDownloadLink && (
                           <a href={pdfDownloadLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-colors" title="Download PDF">
                               <Download size={20} />
                           </a>
                       )}
                       <button onClick={toggleFullScreen} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><Maximize size={20} /></button>
                   </div>
              </div>
              <div ref={containerRef} className="flex-1 w-full bg-slate-200/50 p-4 md:p-8 relative overflow-hidden">
                  <div className="w-full h-full bg-white rounded-[2rem] shadow-xl overflow-hidden relative border border-slate-200">
                      {isPdf ? (
                         <div className="relative w-full h-full group">
                            <iframe src={content.content.replace('/view', '/preview').replace('/edit', '/preview')} className="w-full h-full border-0" allowFullScreen sandbox="allow-scripts allow-same-origin" title="PDF Viewer" />
                            <div className="absolute top-0 right-0 w-24 h-24 z-10 bg-transparent pointer-events-auto"></div>
                         </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white">
                              <ExternalLink size={48} className="text-slate-400 mb-4" />
                              <h3 className="text-2xl font-black text-slate-800 mb-2">External Content</h3>
                              <a href={content.content} target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white font-bold py-4 px-8 rounded-2xl shadow-lg">Open in Browser</a>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // ==========================================
  // 8. HTML NOTES RENDERER
  // ==========================================
  if (content.type === 'NOTES_HTML_FREE' || content.type === 'NOTES_HTML_PREMIUM') {
      const decodedContent = decodeHtml(content.content);
      return (
        <div className="bg-white min-h-screen pb-20 animate-in fade-in">
           <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-sm">
               <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900"><ArrowLeft size={20} /></button>
               <div className="text-center"><h3 className="font-black text-slate-800 text-sm leading-tight">{chapter.title}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{content.type === 'NOTES_HTML_PREMIUM' ? 'Premium Notes' : 'Free Notes'}</p></div>
               <div className="w-8"></div>
           </div>
           <div className="max-w-4xl mx-auto p-6 md:p-12">
               <div className="prose prose-slate max-w-none prose-img:rounded-3xl prose-headings:text-slate-900 prose-headings:font-black" dangerouslySetInnerHTML={{ __html: decodedContent }} />
               <div className="mt-16 pt-10 border-t border-slate-100 text-center"><button onClick={onBack} className="bg-slate-900 text-white font-bold py-4 px-12 rounded-[2rem] shadow-2xl">Complete & Close</button></div>
           </div>
        </div>
      );
  }

  // ==========================================
  // 9. DEFAULT MARKDOWN RENDERER
  // ==========================================
  return (
    <div className="bg-white min-h-screen pb-32 animate-in fade-in">
       <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-4 flex items-center justify-between shadow-sm">
           <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-900"><ArrowLeft size={22} /></button>
           <div className="text-center"><h3 className="font-black text-slate-800 text-sm leading-tight uppercase tracking-tight">{chapter.title}</h3><p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest mt-1">{content.subtitle || 'Study Material'}</p></div>
           <div className="w-8"></div>
       </div>
       <div className="max-w-3xl mx-auto p-6 md:p-14">
           <div className="prose prose-slate prose-lg max-w-none">
               <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                       h1: ({node, ...props}) => <h1 className="text-4xl font-black mb-8 pb-4 border-b-4 border-slate-100" {...props} />,
                       blockquote: ({node, ...props}) => <blockquote className="border-l-[6px] border-blue-500 pl-6 py-4 my-8 bg-blue-50/50 rounded-r-2xl italic" {...props} />,
                   }}>{content.content}</ReactMarkdown>
           </div>
           <div className="mt-20 pt-12 border-t border-slate-100 text-center"><button onClick={onBack} className="bg-slate-900 text-white font-black py-5 px-16 rounded-[2.5rem] shadow-2xl">MARK AS COMPLETE</button></div>
       </div>
    </div>
  );
};
