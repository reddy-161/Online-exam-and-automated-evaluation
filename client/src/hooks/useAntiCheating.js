import { useEffect, useRef } from 'react';

const useAntiCheating = ({ enabled, onViolation }) => {
    const onViolationRef = useRef(onViolation);
    const lastViolationTime = useRef(0);
    const VIOLATION_COOLDOWN = 3000; // 3 second cooldown

    // Keep ref updated without triggering re-runs
    useEffect(() => {
        onViolationRef.current = onViolation;
    }, [onViolation]);

    const triggerViolation = (type) => {
        const now = Date.now();
        if (now - lastViolationTime.current > VIOLATION_COOLDOWN) {
            lastViolationTime.current = now;
            onViolationRef.current(type);
        }
    };

    useEffect(() => {
        if (!enabled) return;

        // Try to enter fullscreen
        const enterFullScreen = async () => {
            try {
                if (!document.fullscreenElement) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.warn('Error attempting to enable fullscreen:', err);
            }
        };

        enterFullScreen();

        // Prevent Right Click
        const handleContextMenu = (e) => {
            e.preventDefault();
        };

        // Prevent Copy, Cut, Paste
        const handleCopyPaste = (e) => {
            e.preventDefault();
        };

        // Detect Tab Switching or Window blurring
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                triggerViolation('tab-switch');
            }
        };

        const handleBlur = () => {
             triggerViolation('window-blur');
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                triggerViolation('exited-fullscreen');
            }
        };

        // Prevent Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+C, etc)
        const handleKeyDown = (e) => {
            // F12
            if (e.key === 'F12') e.preventDefault();
            
            // Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key === 'I') e.preventDefault();
            
            // Ctrl+C, Ctrl+V, Ctrl+X
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x')) e.preventDefault();

            // Alt+Space (ChatGPT Launcher or similar)
            if (e.altKey && e.key === ' ') e.preventDefault();
            
            // Allow typing Space normally, just no Alt+Space
        };

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);

            // We only forcefully exit fullscreen if the component truly unmounts,
            // but the browser might just do it anyway.
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.warn(err));
            }
        };
    }, [enabled]); // Strictly depend ONLY on enabled

};

export default useAntiCheating;
