import React, { useState, useRef, useEffect } from 'react';
import { Youtube } from 'lucide-react';

interface CustomPlayerProps {
    videoUrl: string;
    brandingText?: string; 
    brandingLogo?: string;
    onEnded?: () => void;
}

export const CustomPlayer: React.FC<CustomPlayerProps> = ({ videoUrl, brandingText, onEnded }) => {
    // Extract Video ID
    let videoId = '';
    try {
        if (videoUrl.includes('youtu.be/')) videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
        else if (videoUrl.includes('v=')) videoId = videoUrl.split('v=')[1].split('&')[0];
        else if (videoUrl.includes('embed/')) videoId = videoUrl.split('embed/')[1].split('?')[0];
        if (videoId && videoId.includes('?')) videoId = videoId.split('?')[0];
    } catch(e) {}

    // Construct Native Embed URL with options to minimize branding and hide share
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1&showinfo=0`;

    if (!videoId) {
        return (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center p-6 text-center">
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                        <Youtube size={32} className="text-white/40" />
                    </div>
                    <p className="text-white/60 font-medium">Invalid or unsupported video URL</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black group overflow-hidden" style={{ minHeight: '300px' }}>
             <iframe 
                src={embedUrl} 
                className="w-full h-full absolute inset-0" 
                style={{ border: 'none' }}
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture" 
                allowFullScreen
                title="Video Player"
             />
             
             {/* Share Button Blocker (Top Right) */}
             <div 
                className="absolute top-0 right-0 z-50 pointer-events-auto cursor-default" 
                style={{ 
                    width: '100px', 
                    height: '60px',
                    background: 'transparent'
                }} 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
             />

             {/* Bottom Right YouTube Logo Blocker */}
             <div 
                className="absolute bottom-0 right-0 z-50 pointer-events-auto" 
                style={{ 
                    width: '120px', 
                    height: '60px',
                    background: 'transparent'
                }} 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
             />

             {/* Watermark removed as per user request */}
        </div>
    );
};
