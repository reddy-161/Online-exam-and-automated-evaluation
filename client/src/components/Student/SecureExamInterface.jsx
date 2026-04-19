import React, { useState, useEffect, useRef, useCallback } from 'react';
import useAntiCheating from '../../hooks/useAntiCheating';
import api from '../../utils/api';
import { useNotification } from '../../context/NotificationContext';


const SecureExamInterface = ({ examId, onComplete }) => {
    const { showSuccess, showError } = useNotification();
    const [questions, setQuestions] = useState([]);

    const [attemptId, setAttemptId] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // { question_id: 'A' }
    
    const [timeLeft, setTimeLeft] = useState(null); 
    const [examStarted, setExamStarted] = useState(false);
    const [isReadyForFullscreen, setIsReadyForFullscreen] = useState(false);
    const isSubmittingRef = useRef(false);
    
    const [warningCount, setWarningCount] = useState(0);
    const MAX_WARNINGS = 2; // Auto-submit on 3rd violation
    const [violationType, setViolationType] = useState(null); 
    const [showWarning, setShowWarning] = useState(false);

    const handleFinalSubmit = useCallback(async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        
        try {
            const res = await api.post(`/exams/attempt/${attemptId}/submit`);
            showSuccess(`Exam submitted successfully! Score: ${res.data.score} / ${res.data.totalMarks || '?'}`);
            onComplete(); // Go back to dashboard view
        } catch {
            showError('Failed to submit exam');
            isSubmittingRef.current = false;
        }
    }, [attemptId, onComplete]);

    // Initial setup
    useEffect(() => {
        const startExam = async () => {
            try {
                const res = await api.post(`/exams/${examId}/attempt`);
                setAttemptId(res.data.attemptId);
                setQuestions(res.data.questions);
                setTimeLeft(res.data.exam.duration_minutes * 60); // convert to seconds
                setIsReadyForFullscreen(true);
            } catch (err) {
                showError(err.response?.data?.message || 'Failed to start exam');
                onComplete();
            }
        };
        startExam();
    }, [examId, onComplete]);

    // Timer countdown
    useEffect(() => {
        if (!examStarted || timeLeft === null) return;
        if (timeLeft <= 0) {
            handleFinalSubmit();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [examStarted, timeLeft, handleFinalSubmit]);

    // Anti-Cheating Handler
    const handleViolation = (type) => {
        // Debounce to prevent multiple modals for the same single event
        if (violationType) return;

        setViolationType(type);
        setWarningCount(prev => {
            const temp = prev + 1;
            if (temp > MAX_WARNINGS) {
                handleFinalSubmit(); // Boot them
            }
            return temp;
        });
    };

    useAntiCheating({ enabled: examStarted, onViolation: handleViolation });

    // Handle Option Select & Save
    const handleOptionSelect = async (qId, option) => {
        setAnswers(prev => ({ ...prev, [qId]: option }));
        // Auto-save silently
        const payload = {
            question_id: qId,
            selected_option: option,
            text_answer: null
        };
        try {
            await api.post(`/exams/attempt/${attemptId}/save`, payload);
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
    };

    // UI Formatting
    const formatTime = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0':''}${s}`;
    };

    if (!examStarted && !isReadyForFullscreen) {
        return <div className="container" style={{padding:'2rem', textAlign:'center'}}><h3>Preparing Secure Environment...</h3><div className="spinner" style={{margin:'1rem auto'}}></div></div>;
    }

    if (isReadyForFullscreen) {
        return (
            <div className="container" style={{padding:'2rem', textAlign:'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <h3 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--error)' }}>Restricted Exam Environment</h3>
                <p style={{marginBottom: '2rem', maxWidth: '600px', fontSize: '1.1rem', color: 'var(--text-secondary)'}}>
                    This exam requires a secure full-screen environment. You cannot exit full screen, switch tabs, copy text, or use external tools. Doing these actions will trigger <strong>automatic warnings</strong> and submit your exam immediately upon reaching the limit.
                </p>
                <button 
                    onClick={async () => {
                        try { await document.documentElement.requestFullscreen(); } catch (e) { console.warn('Fullscreen request failed:', e); }
                        setIsReadyForFullscreen(false);
                        setExamStarted(true);
                    }} 
                    className="btn btn-primary" 
                    style={{fontSize: '1.2rem', padding: '1rem 3rem', background: 'var(--error)'}}
                >
                    Launch Secure Fullscreen Exam
                </button>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div style={{ padding: '2rem', height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg-gradient-start)', userSelect: 'none', WebkitUserSelect: 'none' }}>
            {/* Top Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom:'2rem' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: timeLeft < 60 ? 'var(--error)' : 'white' }}>
                    Time Left: {formatTime(timeLeft)}
                </div>
                <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Question {currentIndex + 1} of {questions.length}</span>
                    <button onClick={handleFinalSubmit} className="btn btn-outline" style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
                        Finish Exam
                    </button>
                </div>
            </div>

            {violationType && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', 
                    alignItems: 'center', justifyContent: 'center', padding: '2rem'
                }}>
                    <div className="glass-panel" style={{ maxWidth: '500px', textAlign: 'center', border: '2px solid var(--error)' }}>
                        <h2 style={{ color: 'var(--error)', marginBottom: '1rem' }}>Security Violation!</h2>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
                            {violationType === 'exited-fullscreen' ? 'You exited full-screen mode.' : 
                             violationType === 'tab-switch' ? 'You switched tabs or minimized the window.' : 
                             'The exam window lost focus.'}
                        </p>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>
                                Warnings: {warningCount} / {MAX_WARNINGS + 1}
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                The exam will automatically submit if you reach {MAX_WARNINGS + 1} warnings.
                            </p>
                        </div>
                        {warningCount <= MAX_WARNINGS && (
                            <button 
                                onClick={async () => {
                                    try { 
                                        if (!document.fullscreenElement) {
                                            await document.documentElement.requestFullscreen(); 
                                        }
                                    } catch (e) { console.warn(e); }
                                    setViolationType(null);
                                }} 
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                            >
                                Return to Exam (Full Screen)
                            </button>
                        )}
                        {warningCount > MAX_WARNINGS && (
                            <p style={{ color: 'var(--error)', fontWeight: 'bold' }}>
                                Warning limit exceeded. Submitting exam...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Question Area */}
            <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', lineHeight: 1.5 }}>
                    {currentIndex + 1}. {currentQ.content}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: 'auto' }}>
                    {(!currentQ.type || currentQ.type === 'mcq') && ['A', 'B', 'C', 'D'].map(opt => {
                        const optKey = `option_${opt.toLowerCase()}`;
                        return (
                            <label key={opt} style={{ 
                                display: 'flex', alignItems: 'center', padding: '1rem', background: answers[currentQ.id] === opt ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)', 
                                border: `1px solid ${answers[currentQ.id] === opt ? 'var(--primary)' : 'var(--border-subtle)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                            }}>
                                <input 
                                    type="radio" 
                                    name={`q_${currentQ.id}`} 
                                    value={opt} 
                                    checked={answers[currentQ.id] === opt}
                                    onChange={() => handleOptionSelect(currentQ.id, opt)}
                                    style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
                                />
                                <span style={{ fontSize: '1.1rem' }}>{opt}. {currentQ[optKey]}</span>
                            </label>
                        )
                    })}
                    
                    {(currentQ.type === 'tf' || currentQ.type === 'true_false') && ['True', 'False'].map(opt => {
                        return (
                            <label key={opt} style={{ 
                                display: 'flex', alignItems: 'center', padding: '1rem', background: answers[currentQ.id] === opt ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255,255,255,0.05)', 
                                border: `1px solid ${answers[currentQ.id] === opt ? 'var(--primary)' : 'var(--border-subtle)'}`, borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                            }}>
                                <input 
                                    type="radio" 
                                    name={`q_${currentQ.id}`} 
                                    value={opt} 
                                    checked={answers[currentQ.id] === opt}
                                    onChange={() => handleOptionSelect(currentQ.id, opt)}
                                    style={{ marginRight: '1rem', transform: 'scale(1.2)' }}
                                />
                                <span style={{ fontSize: '1.1rem' }}>{opt}</span>
                            </label>
                        )
                    })}

                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <button 
                        className="btn btn-outline" 
                        onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentIndex === 0}
                    >
                        &larr; Previous
                    </button>
                    {currentIndex < questions.length - 1 ? (
                        <button 
                            className="btn btn-primary" 
                            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        >
                            Save & Next &rarr;
                        </button>
                    ) : (
                        <button className="btn btn-primary" style={{ background: 'var(--success)' }} onClick={handleFinalSubmit}>
                            Submit Final Answers
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecureExamInterface;
