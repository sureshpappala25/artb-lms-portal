'use client';

import { useEffect, useState, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { apiRequest } from '@/lib/api';
import { ROUTES } from '@/constants';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function ExamInterface({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [exam, setExam] = useState<any>(null);
    const [attempt, setAttempt] = useState<any>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
    const [warnings, setWarnings] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [timeTaken, setTimeTaken] = useState(0);
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [examStarted, setExamStarted] = useState(false); // NEW: exam hasn't started yet
    const [showSectionTransitionConfirm, setShowSectionTransitionConfirm] = useState(false);
    const [showFinalSubmitConfirm, setShowFinalSubmitConfirm] = useState(false);
    const [showResetCodeConfirm, setShowResetCodeConfirm] = useState(false);
    const [tabSwitchWarning, setTabSwitchWarning] = useState<{ show: boolean, message: string, isDisqualified?: boolean, isGeneric?: boolean } | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('javascript');
    const [executionResults, setExecutionResults] = useState<any>(null);
    const [isRunningExecution, setIsRunningExecution] = useState(false);
    const [lastExecutionType, setLastExecutionType] = useState<'run' | 'submit' | null>(null);
    const [compilationError, setCompilationError] = useState<string | null>(null);
    const [runtimeOutput, setRuntimeOutput] = useState<string | null>(null);
    const [theme, setTheme] = useState<'vs' | 'vs-dark'>('vs');
    const [user, setUser] = useState<any>(null);
    const [section, setSection] = useState<'mcq' | 'coding'>('mcq');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [splitWidth, setSplitWidth] = useState(50); // Equal halves by default
    const [testcaseHeight, setTestcaseHeight] = useState(35); // 35% height
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [instructionTimer, setInstructionTimer] = useState(60);
    const [isResuming, setIsResuming] = useState(false);
    const isResizingWidth = useRef(false);
    const isResizingHeight = useRef(false);
    const executionAbortRef = useRef<AbortController | null>(null);
    const sectionRef = useRef<'mcq' | 'coding'>('mcq');

    const DEFAULT_LANGUAGE_CODE: Record<string, string> = {
        c: '#include<stdio.h>\n\nint main() {\n    // your code here\n    return 0;\n}',
        cpp: '#include<iostream>\nusing namespace std;\n\nint main() {\n    // your code here\n    return 0;\n}',
        python: '# your code here',
        java: 'import java.util.*;\n\npublic class Solution {\n    public static void main(String[] args) {\n        // your code here\n    }\n}',
        javascript: '// your code here'
    };

    const [questionDrafts, setQuestionDrafts] = useState<Record<string, Record<string, string>>>({});

    useEffect(() => {
        const handleThemeChange = () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            setTheme(isDark ? 'vs-dark' : 'vs');
        };

        handleThemeChange(); // Initial check
        window.addEventListener('theme-change', handleThemeChange);
        return () => window.removeEventListener('theme-change', handleThemeChange);
    }, []);

    const runTestCases = async (type: 'run' | 'submit') => {
        const currentQuestion = exam?.questions[currentQuestionIndex];
        if (!currentQuestion || currentQuestion.type !== 'coding') return;

        // Cancel any previous in-flight execution
        if (executionAbortRef.current) {
            executionAbortRef.current.abort();
        }
        const abortController = new AbortController();
        executionAbortRef.current = abortController;

        const draft = questionDrafts[currentQuestion._id]?.[selectedLanguage];
        const submittedAnswer = selectedAnswers[currentQuestion._id];
        let code = draft || DEFAULT_LANGUAGE_CODE[selectedLanguage];
        if (submittedAnswer && typeof submittedAnswer === 'object' && submittedAnswer.language === selectedLanguage) {
            code = submittedAnswer.code;
        }

        const testCases = currentQuestion.test_cases || [];

        // Filter test cases: 'run' only public, 'submit' all
        const testCasesToRun = type === 'run'
            ? testCases.filter((tc: any) => !tc.is_hidden)
            : testCases;

        setIsRunningExecution(true);
        setLastExecutionType(type);
        setExecutionResults(null);
        setCompilationError(null);
        setRuntimeOutput(null);

        try {
            const data = await apiRequest('/sandbox/execute', {
                method: 'POST',
                body: JSON.stringify({
                    language: selectedLanguage,
                    code,
                    test_cases: testCasesToRun
                }),
                signal: abortController.signal
            });

            // If this run was aborted, ignore results
            if (abortController.signal.aborted) return;

            setExecutionResults(data.results || []);
            setCompilationError(data.compilation_error || null);
            setRuntimeOutput(data.runtime_output || null);

            if (type === 'submit') {
                // Also save the code to selectedAnswers
                setSelectedAnswers({
                    ...selectedAnswers,
                    [currentQuestion._id]: { code, language: selectedLanguage }
                });
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return; // Ignore aborted requests
            setTabSwitchWarning({ show: true, message: err.message || 'Execution failed', isGeneric: true });
        } finally {
            if (!abortController.signal.aborted) {
                setIsRunningExecution(false);
            }
        }
    };

    const MAX_WARNINGS = 2; // auto-submit on 2nd switch
    const submittedRef = useRef(false);
    const attemptRef = useRef<any>(null);
    const warningsRef = useRef(0);
    const examRef = useRef<any>(null);
    const selectedAnswersRef = useRef<Record<string, any>>({});
    const selectedLanguageRef = useRef('javascript');
    const isUnloadingRef = useRef(false);
    const timeTakenRef = useRef(0);

    // Keep refs in sync with state
    useEffect(() => { attemptRef.current = attempt; }, [attempt]);
    useEffect(() => { examRef.current = exam; }, [exam]);
    useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);
    useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);
    useEffect(() => { timeTakenRef.current = timeTaken; }, [timeTaken]);
    useEffect(() => { sectionRef.current = section; }, [section]);

    useEffect(() => {
        // Reset execution state on question change
        setExecutionResults(null);
        setLastExecutionType(null);
        setCompilationError(null);
        setRuntimeOutput(null);

        // When changing questions, check if we already have a language set for this question
        const currentQuestion = exam?.questions?.[currentQuestionIndex];
        if (currentQuestion && currentQuestion.type === 'coding') {
            const answer = selectedAnswers[currentQuestion._id];
            if (answer && typeof answer === 'object' && answer.language) {
                setSelectedLanguage(answer.language);
            } else {
                // Check if there's any draft
                const drafts = questionDrafts[currentQuestion._id];
                if (drafts) {
                    const existingLanguages = Object.keys(drafts);
                    if (existingLanguages.length > 0 && !drafts[selectedLanguage]) {
                        // Only switch if current selected language has no draft, otherwise keep it
                        setSelectedLanguage(existingLanguages[0]);
                    }
                }
            }
        }
    }, [currentQuestionIndex, exam]); // Removed selectedAnswers and questionDrafts to prevent rollback

    useEffect(() => {
        const updateTheme = () => {
            const savedTheme = localStorage.getItem('theme') || 'light';
            setTheme(savedTheme === 'dark' ? 'vs-dark' : 'vs');
        };
        updateTheme();
        window.addEventListener('storage', updateTheme);
        window.addEventListener('storage', updateTheme);
        window.addEventListener('theme-change', updateTheme);

        const handleMouseMove = (e: MouseEvent) => {
            if (isResizingWidth.current) {
                const percentage = (e.clientX / window.innerWidth) * 100;
                if (percentage > 20 && percentage < 80) setSplitWidth(percentage);
            }
            if (isResizingHeight.current) {
                const headerHeight = 70;
                const availableHeight = window.innerHeight - headerHeight;
                const percentage = ((window.innerHeight - e.clientY) / availableHeight) * 100;
                if (percentage > 10 && percentage < 80) setTestcaseHeight(percentage);
            }
        };

        const handleMouseUp = () => {
            isResizingWidth.current = false;
            isResizingHeight.current = false;
            document.body.style.cursor = 'default';
        };

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            window.removeEventListener('storage', updateTheme);
            window.removeEventListener('theme-change', updateTheme);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    // Helper: detect desktop (non-touch, wide screen)
    const isDesktop = () => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth >= 1024 && navigator.maxTouchPoints === 0;
    };

    useEffect(() => {
        // Anti-cheat: Disable copy, paste, cut, right-click and block clipboard API on ALL devices
        const preventCheat = (e: any) => {
            if (e.type === 'keydown') {
                const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v' || (e.shiftKey && e.key === 'Insert');
                const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
                const isCut = (e.ctrlKey || e.metaKey) && e.key === 'x';
                // Block Windows Emoji Picker (Win+. and Win+;)
                const isEmojiPicker = e.metaKey && (e.key === '.' || e.key === ';');
                // Block other suspicious combos
                const isSysClip = e.key === 'ContextMenu'; // right-click menu key

                if (isPaste || isCopy || isCut || isEmojiPicker || isSysClip) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isPaste) {
                        setTabSwitchWarning({ show: true, message: 'Paste is disabled in this exam.', isGeneric: true });
                    }
                    return false;
                }
            } else {
                e.preventDefault();
                return false;
            }
        };

        const handlePasteEvent = (e: ClipboardEvent) => {
            if (e.type === 'paste') {
                e.preventDefault();
                setTabSwitchWarning({ show: true, message: 'Paste is disabled in this exam.', isGeneric: true });
            }
        };

        // Override navigator.clipboard API to block programmatic clipboard access
        try {
            if (navigator.clipboard) {
                Object.defineProperty(navigator, 'clipboard', {
                    value: {
                        writeText: () => Promise.reject(new Error('Clipboard access disabled during exam.')),
                        readText: () => Promise.reject(new Error('Clipboard access disabled during exam.')),
                        write: () => Promise.reject(new Error('Clipboard access disabled during exam.')),
                        read: () => Promise.reject(new Error('Clipboard access disabled during exam.')),
                    },
                    writable: false,
                    configurable: false
                });
            }
        } catch (_) { /* already overridden */ }

        // Block mobile keyboard clipboard toolbar (iOS/Android long press → copy/paste popup)
        const clearSelection = () => {
            if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
            }
        };

        document.addEventListener('copy', preventCheat);
        document.addEventListener('paste', handlePasteEvent);
        document.addEventListener('cut', preventCheat);
        document.addEventListener('contextmenu', preventCheat);
        document.addEventListener('keydown', preventCheat);
        document.addEventListener('selectionchange', clearSelection);

        return () => {
            document.removeEventListener('copy', preventCheat);
            document.removeEventListener('paste', handlePasteEvent);
            document.removeEventListener('cut', preventCheat);
            document.removeEventListener('contextmenu', preventCheat);
            document.removeEventListener('keydown', preventCheat);
            document.removeEventListener('selectionchange', clearSelection);
        };
    }, []);

    // Tab Switch / Window Blur tracking
    useEffect(() => {
        if (!examStarted || submittedRef.current || !attemptRef.current) return;

        let lastWarningTime = 0;

        const handleTabSwitch = async () => {
            if (isUnloadingRef.current) return; // Ignore switches during refresh/close
            const now = Date.now();
            if (submittedRef.current || now - lastWarningTime < 5000) return; // Strict 5 second debounce 
            if ((window as any).__isNativeModalOpen) return; // Avoid triggering on blur caused by native alerts

            lastWarningTime = now;
            const currentWarnings = warningsRef.current;
            warningsRef.current += 1;
            setWarnings(warningsRef.current);

            try {
                // Report violation to backend which increments tab_switch_count
                const response = await apiRequest(`/attempts/${attemptRef.current._id}/violation`, {
                    method: 'POST',
                    body: JSON.stringify({ time_taken: timeTakenRef.current })
                });

                if (response.status === 'disqualified') {
                    setTabSwitchWarning({ show: true, message: 'You have exceeded the maximum number of tab switches. Your exam is being automatically submitted.', isDisqualified: true });
                    // Give them 3 seconds to read it before kicking them out
                    setTimeout(async () => {
                        setTabSwitchWarning(null);
                        if (handleSubmissionRef.current) {
                            await handleSubmissionRef.current(true, 'Maximum tab switches exceeded. Auto-submitted.');
                        }
                    }, 3000);
                } else {
                    setTabSwitchWarning({ show: true, message: `WARNING: Tab switching is not allowed! You have switched tabs ${warningsRef.current} time(s).\n\nIf you switch tabs again, your exam will be auto-submitted.`, isDisqualified: false });
                }
            } catch (err) {
                console.error('Failed to report violation', err);
            }
        };

        const onVisibilityChange = () => {
            if (document.hidden) handleTabSwitch();
        };

        const onWindowBlur = () => {
            // Document hidden covers most cases, but window blur catches alt-tabbing to other apps or side-by-side clicks
            if (!document.hidden) handleTabSwitch();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('blur', onWindowBlur);

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('blur', onWindowBlur);
        };
    }, [examStarted]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // 1. Fetch Exam
                const examData = await apiRequest(`/exams/${id}`);

                // Sort questions: MCQs first, then Coding
                const typeOrder = { mcq: 1, descriptive: 1, file: 1, coding: 2 };
                const sortedQuestions = [...examData.questions].sort((a: any, b: any) => {
                    return (typeOrder[a.type as keyof typeof typeOrder] || 3) - (typeOrder[b.type as keyof typeof typeOrder] || 3);
                });
                examData.questions = sortedQuestions;

                setExam(examData);
                examRef.current = examData;

                // 2. Start/Fetch Attempt
                const attemptData = await apiRequest(`/attempts/start/${id}`, {
                    method: 'POST'
                });
                const currentAttempt = attemptData.attempt || attemptData;

                let initialSection: 'mcq' | 'coding' = 'mcq';
                let initialTimeLeft = 0;
                let initialCurrentQuestionIndex = 0;
                let initialAnswersMap: Record<string, any> = {};
                let initialQuestionDrafts: Record<string, Record<string, string>> = {};
                let initialExamStarted = false;
                let initialIsResuming = false;
                let initialSubmitted = false;

                if (currentAttempt) {
                    // If resuming, skip instruction screen
                    const mcqs = examData.questions.filter((q: any) => q.type === 'mcq');
                    const coding = examData.questions.filter((q: any) => q.type === 'coding');

                    if (mcqs.length === 0 && coding.length > 0) initialSection = 'coding';
                    else initialSection = 'mcq';

                    // Check if this is a refresh vs a new session or interrupted session
                    const storageKey = `exam_active_${id}`;
                    const timerKey = `exam_timer_${id}`;

                    // [Clean Retake logic] Detect if backend attempt has ZERO progress
                    const hasNoProgress = (!currentAttempt.answers || currentAttempt.answers.length === 0) &&
                        (currentAttempt.last_question_index === 0) &&
                        (!currentAttempt.time_taken || currentAttempt.time_taken === 0);

                    // Even if localStorage says we are "active", if backend says currentAttempt is fresh,
                    // we MUST clear local state and show instructions.
                    if (hasNoProgress && typeof window !== 'undefined') {
                        console.log(`[Persistence] Fresh backend attempt detected. Clearing any stale local storage.`);
                        sessionStorage.removeItem(storageKey);
                        sessionStorage.removeItem(timerKey);
                        sessionStorage.removeItem(`exam_time_taken_${id}`);
                    }

                    let isRefresh = typeof window !== 'undefined' && !!sessionStorage.getItem(storageKey);
                    const savedTimer = typeof window !== 'undefined' ? sessionStorage.getItem(timerKey) : null;

                    // Calculate remaining time
                    const endByDate = new Date(examData.end_time).getTime();
                    const now = new Date().getTime();
                    const timeUntilEnd = Math.max(0, Math.floor((endByDate - now) / 1000));

                    let remaining = timeUntilEnd;

                    if (isRefresh && savedTimer) {
                        remaining = parseInt(savedTimer);
                        console.log(`[Persistence] Resuming from refresh. Saved timer: ${remaining}s`);
                    } else if (!hasNoProgress && currentAttempt.remaining_time > 0) {
                        // Only use backend remaining_time if there's actual progress (true resume)
                        remaining = Math.min(timeUntilEnd, currentAttempt.remaining_time);
                        console.log(`[Persistence] Resuming from backend. Remaining time: ${remaining}s`);
                    } else {
                        // Fresh attempt or no saved timer — always use section-specific duration
                        console.log(`[Persistence] Fresh attempt. Calculating section-specific duration.`);

                        if (!isRefresh) {
                            initialAnswersMap = {};
                            initialQuestionDrafts = {};
                        }

                        // For a fresh attempt, always start with the section-specific duration
                        if (initialSection === 'mcq' && examData.mcq_duration) {
                            remaining = Math.min(timeUntilEnd, examData.mcq_duration * 60);
                        } else if (initialSection === 'coding' && examData.coding_duration) {
                            remaining = Math.min(timeUntilEnd, examData.coding_duration * 60);
                        } else if (examData.duration) {
                            remaining = Math.min(timeUntilEnd, examData.duration * 60);
                        } else {
                            remaining = Math.min(timeUntilEnd, 3600);
                        }
                    }
                    initialTimeLeft = remaining;

                    // On resume, figure out which section we were in
                    const lastIdx = currentAttempt.last_question_index || 0;
                    if (lastIdx >= mcqs.length && coding.length > 0) {
                        initialSection = 'coding';
                    }
                    initialCurrentQuestionIndex = lastIdx;

                    // 3. Load existing answers if any
                    currentAttempt.answers?.forEach((ans: any) => {
                        if (ans.question_id) {
                            const q = examData.questions.find((q: any) => q._id === ans.question_id);
                            if (q?.type === 'coding') {
                                initialAnswersMap[ans.question_id] = { code: ans.code_submitted, language: ans.language };
                                initialQuestionDrafts = {
                                    ...initialQuestionDrafts,
                                    [ans.question_id]: {
                                        [ans.language]: ans.code_submitted
                                    }
                                };
                            } else {
                                initialAnswersMap[ans.question_id] = ans.selected_option !== undefined ? ans.selected_option : ans.text_answer;
                            }
                        }
                    });

                    // Set all states before marking loading as complete
                    setExam(examData);
                    examRef.current = examData;
                    setAttempt(currentAttempt);
                    attemptRef.current = currentAttempt;
                    setSection(initialSection);
                    setSelectedAnswers(initialAnswersMap);
                    setQuestionDrafts(initialQuestionDrafts);
                    setTimeLeft(initialTimeLeft);
                    setTimeTaken(currentAttempt.time_taken || 0);

                    if (initialCurrentQuestionIndex !== undefined) {
                        setCurrentQuestionIndex(initialCurrentQuestionIndex);
                    }

                    if (isRefresh) {
                        initialExamStarted = true;
                        console.log("[Persistence] Exam started due to refresh.");
                    } else {
                        // Detect if there's actual progress to show 'Resume'
                        const hasProgress = (currentAttempt.last_question_index > 0) ||
                            (currentAttempt.answers && currentAttempt.answers.length > 0) ||
                            (currentAttempt.remaining_time < (examData.duration * 60) - 10); // 10s buffer

                        if (currentAttempt.status === 'ongoing' && hasProgress) {
                            initialIsResuming = true;
                            console.log("[Persistence] Exam is resumable due to existing progress.");
                        } else if (currentAttempt.status === 'ongoing') {
                            console.log("[Persistence] Exam is ongoing but no significant progress detected for 'Resume' screen.");
                        }
                    }
                }

                if (currentAttempt.status === 'evaluated' || currentAttempt.status === 'disqualified' || currentAttempt.status === 'submitted') {
                    initialSubmitted = true;
                    submittedRef.current = true;
                    setResults(currentAttempt);
                    // Exit Fullscreen on results
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => { });
                    }
                }

                if (currentAttempt.tab_switch_count !== undefined) {
                    warningsRef.current = currentAttempt.tab_switch_count;
                    setWarnings(currentAttempt.tab_switch_count);
                }

                setExamStarted(initialExamStarted);
                setIsResuming(initialIsResuming);
                setSubmitted(initialSubmitted);
                setIsLoading(false);
            } catch (err: any) {
                console.error(err);
                setTabSwitchWarning({ show: true, message: err.message || 'Failed to initialize exam', isGeneric: true });
                router.push(ROUTES.STUDENT_DASHBOARD);
            }
        };

        loadInitialData();
    }, [id, router]);

    useEffect(() => {
        const data = localStorage.getItem('user');
        if (data) {
            try {
                setUser(JSON.parse(data));
            } catch (err) {
                console.error('Error parsing user data:', err);
            }
        }
    }, []);

    useEffect(() => {
        if (!exam || examStarted || submitted || !exam.description) return;

        const timer = setInterval(() => {
            setInstructionTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [exam, examStarted, submitted]);

    // Core submit function using refs to avoid stale closure
    const handleSubmissionRef = useRef<(isAuto?: boolean, reason?: string) => Promise<void>>(undefined);

    const autoSaveProgress = useCallback(async (index?: number, timeOverride?: number) => {
        const currentAttempt = attemptRef.current;
        if (!currentAttempt || submittedRef.current) return;

        try {
            const answers = Object.entries(selectedAnswersRef.current).map(([qId, val]) => {
                if (typeof val === 'object' && val.code) {
                    return { question_id: qId, code_submitted: val.code, language: val.language };
                }
                return { question_id: qId, selected_option: typeof val === 'number' ? val : undefined, text_answer: typeof val === 'string' ? val : undefined };
            });

            await apiRequest(`/attempts/${currentAttempt._id}/save`, {
                method: 'POST',
                body: JSON.stringify({
                    last_question_index: index !== undefined ? index : currentQuestionIndex,
                    remaining_time: timeOverride !== undefined ? timeOverride : timeLeft,
                    time_taken: timeTakenRef.current,
                    answers
                })
            });
        } catch (err) {
            console.error('Auto-save failed:', err);
        }
    }, [currentQuestionIndex, timeLeft]);

    // Save on question change
    const navigateToQuestion = useCallback((index: number) => {
        autoSaveProgress(index);
        setCurrentQuestionIndex(index);
    }, [autoSaveProgress]);

    // Helper to move to coding section
    const startCodingSection = useCallback((isAuto = false) => {
        if (!exam) return;
        const firstCodingIdx = exam.questions.findIndex((q: any) => q.type === 'coding');
        if (firstCodingIdx !== -1) {
            const codingTime = (exam.coding_duration || 30) * 60;
            setSection('coding');
            setCurrentQuestionIndex(firstCodingIdx);
            setTimeLeft(codingTime);
            autoSaveProgress(firstCodingIdx, codingTime);

            if (isAuto) {
                // We use a custom toast or simply no alert to prevent dropping fullscreen status.
                setTabSwitchWarning({ show: true, message: 'MCQ Section Time is up! Automatically moving to Coding Section.', isGeneric: true });
                console.log("MCQ section time is up! Auto-submitting MCQs and starting Coding section.");
            }
        } else {
            handleSubmissionRef.current?.(true, "Time is up for MCQ section and no coding questions found. Submitting exam.");
        }
    }, [exam, autoSaveProgress]);

    // Sync with backend every 10 seconds
    useEffect(() => {
        if (!examStarted || submitted) return;
        const interval = setInterval(() => autoSaveProgress(), 10000);

        const handleBeforeUnload = () => {
            isUnloadingRef.current = true;
            autoSaveProgress();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [examStarted, submitted, autoSaveProgress]);

    handleSubmissionRef.current = async (isAuto = false, reason = '') => {
        if (submittedRef.current) return;

        if (!isAuto && !showFinalSubmitConfirm) {
            setShowFinalSubmitConfirm(true);
            return;
        }

        if (reason) {
            setTabSwitchWarning({ show: true, message: reason, isGeneric: true });
        }

        submittedRef.current = true;
        setSubmitted(true);
        if (reason) setTabSwitchWarning({ show: true, message: reason, isGeneric: true });

        try {
            const currentAttempt = attemptRef.current;
            const currentExam = examRef.current;
            const currentAnswers = selectedAnswersRef.current;
            const currentLang = selectedLanguageRef.current;

            if (!currentAttempt?._id) {
                setTabSwitchWarning({ show: true, message: 'Attempt not found. Cannot submit.', isGeneric: true });
                return;
            }

            const answers = Object.entries(currentAnswers).map(([qId, val]) => {
                const question = currentExam?.questions?.find((q: any) => q._id === qId);
                const result: any = { question_id: qId };

                if (question?.type === 'mcq') {
                    result.selected_option = val;
                } else if (question?.type === 'coding') {
                    result.code_submitted = typeof val === 'object' ? val.code : val;
                    result.language = typeof val === 'object' ? val.language : currentLang;
                } else if (question?.type === 'descriptive') {
                    result.text_answer = val;
                }
                return result;
            });

            const data = await apiRequest(`/attempts/${currentAttempt._id}/submit`, {
                method: 'POST',
                body: JSON.stringify({
                    answers,
                    time_taken: timeTakenRef.current
                })
            });

            setResults(data.attempt);
            // Exit Fullscreen on reveal
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        } catch (err: any) {
            submittedRef.current = false;
            setSubmitted(false);
            setTabSwitchWarning({ show: true, message: err.message || 'Error submitting exam', isGeneric: true });
        }
    };


    // Timer — only runs after exam is started
    useEffect(() => {
        if (!exam || !examStarted || submitted) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                const newVal = prev <= 1 ? 0 : prev - 1;
                sessionStorage.setItem(`exam_timer_${id}`, newVal.toString());

                if (prev <= 1) {
                    clearInterval(timer);
                    // Use sectionRef instead of section to avoid stale closure
                    const currentSection = sectionRef.current;
                    if (currentSection === 'mcq' && examRef.current?.has_coding) {
                        startCodingSection(true);
                        return 0;
                    } else {
                        handleSubmissionRef.current?.(true, 'Section time is up! Auto-submitting your assessment.');
                        return 0;
                    }
                }
                return prev - 1;
            });

            setTimeTaken(prev => {
                const newVal = (prev || 0) + 1;
                sessionStorage.setItem(`exam_time_taken_${id}`, newVal.toString());
                return newVal;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [exam, examStarted, submitted, startCodingSection]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (isLoading) return <div className="loading">Loading Exam...</div>;

    if (results) {
        return (
            <div className="container results-view fade-in">
                <div className="card" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '3rem', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                    <div className="success-icon" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                    <h2 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>Exam Completed!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Well done on completing "{exam.title}"</p>

                    <div className="score-circle">
                        <div className="score-val">{results.obtained_marks}</div>
                        <div className="score-total">Marks Obtained</div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="result-meta">Status: <span style={{ color: 'var(--accent)' }}>{results.status?.toUpperCase()}</span></div>
                        <button className="btn btn-primary" onClick={() => router.push('/student')}>Back to Dashboard</button>
                    </div>
                </div>

                <style jsx>{`
                    .results-view { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                    .score-circle {
                        width: 150px; height: 150px; border-radius: 50%; border: 4px solid var(--primary);
                        margin: 0 auto; display: flex; flex-direction: column; justify-content: center; align-items: center;
                        background: var(--muted-bg);
                        box-shadow: var(--card-shadow);
                    }
                    .score-val { font-size: 3rem; font-weight: 800; color: var(--primary); line-height: 1; }
                    .score-total { font-size: 0.8rem; color: var(--text-secondary); margin-top: 5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                    .result-meta { font-weight: 600; color: var(--text-color); }
                `}</style>
            </div>
        );
    }

    // Start screen — shown before student clicks "Begin Exam"
    if (!examStarted) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)', padding: '1.5rem' }}>
                <div className="card" style={{ maxWidth: '600px', width: '100%', padding: '3rem', textAlign: 'center', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                    <h3 style={{ color: 'var(--text-color)', marginBottom: '0.5rem' }}>Assessment Title:  {exam.title}</h3>
                    <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>📋 INSTRUCTIONS </h3>

                    {exam.description && instructionTimer > 0 && (
                        <div style={{ textAlign: 'left', background: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
                            <div style={{ color: 'var(--text-color)', fontSize: '0.95rem', lineHeight: '1.6' }}
                                dangerouslySetInnerHTML={{ __html: exam.description }} />
                        </div>
                    )}

                    {instructionTimer <= 0 && (
                        <div style={{ background: 'rgba(217, 48, 37, 0.05)', border: '1px solid rgba(217, 48, 37, 0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <p style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Anti-Cheat Rules</p>
                            <ul style={{ color: 'var(--text-color)', fontSize: '0.95rem', paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <li>Do not switch tabs or minimize the browser window.</li>
                                <li>You will receive a warning for each tab switch.</li>
                                <li>On your <strong>2nd tab switch</strong>, the exam will be <strong>auto-submitted</strong>.</li>
                                <li>Copy, paste, and right-click are disabled.</li>
                            </ul>
                        </div>
                    )}

                    <button
                        className="btn btn-primary"
                        style={{
                            padding: '0.9rem 3rem',
                            fontSize: '1.1rem',
                            opacity: (exam.description && instructionTimer > 0 && !isResuming) ? 0.6 : 1,
                            cursor: (exam.description && instructionTimer > 0 && !isResuming) ? 'not-allowed' : 'pointer'
                        }}
                        disabled={!!(exam.description && instructionTimer > 0 && !isResuming)}
                        onClick={() => {
                            setExamStarted(true);
                            sessionStorage.setItem(`exam_active_${id}`, 'true');
                            // Force Fullscreen on desktop only
                            if (isDesktop()) {
                                const element = document.documentElement;
                                if (element.requestFullscreen) {
                                    element.requestFullscreen().then(() => {
                                        setIsFullscreen(true);
                                    }).catch(err => {
                                        console.log('Fullscreen request failed:', err);
                                    });
                                }
                            } else {
                                // Mobile/tablet: mark as fullscreen so the overlay never shows
                                setIsFullscreen(true);
                            }
                        }}
                    >
                        {isResuming
                            ? '🚀 Resume Exam'
                            : (exam.description && instructionTimer > 0
                                ? `Please read instructions (${instructionTimer}s)`
                                : '🚀 Begin Exam')}
                    </button>
                </div>
            </div >
        );
    }

    const currentQuestion = exam.questions[currentQuestionIndex];

    return (
        <div
            className="exam-layout fade-in"
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onPaste={(e) => e.preventDefault()}
            onClick={() => {
                // Silently ensure fullscreen without prompting when the user interacts
                if (examStarted && !submitted && isDesktop() && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(() => { });
                }
            }}
            style={{ WebkitUserSelect: 'none', userSelect: 'none' } as any}
        >

            <header className="exam-header" style={{ height: 'var(--header-height)', padding: '0.6rem 1.5rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--card-shadow)', position: 'relative', zIndex: 1001 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        className="menu-toggle"
                        style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-color)', cursor: 'pointer' }}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                    <div className="logo" style={{ color: 'var(--primary)', fontWeight: '800', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'var(--primary)', width: '24px', height: '24px', borderRadius: '4px' }}></span> ARTB - LMS
                    </div>
                    <div className="candidate-info" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Candidate: <span style={{ color: 'var(--text-color)', fontWeight: '600', marginRight: '1rem' }}>{user?.name || 'STUDENT'}</span>
                        Test: <span style={{ color: 'var(--text-color)', fontWeight: '600' }}>{exam.title}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="section-badge" style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' }}>
                        {section === 'mcq' ? 'MCQ SECTION' : 'CODING SECTION'}
                    </div>
                    <div className="timer-container" style={{ display: 'flex', gap: '1rem' }}>
                        <div className="timer-box" style={{ background: 'var(--bg-color)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                                {section === 'mcq' ? 'MCQ Section Duration' : 'Coding Section Duration'}
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: timeLeft < 300 ? 'var(--danger)' : 'var(--primary)', fontFamily: 'monospace' }}>{formatTime(timeLeft)}</div>
                        </div>
                    </div>
                    <ThemeToggle />
                    <button
                        className="btn"
                        style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer' }}
                        onClick={() => handleSubmissionRef.current?.()}
                    >
                        Finish Test
                    </button>
                </div>
                <style jsx>{`
                    @media (max-width: 1024px) {
                        .menu-toggle { display: block !important; }
                        .candidate-info { display: none !important; }
                    }
                `}</style>
            </header>

            <div className="exam-content">
                <aside className={`question-nav ${isMenuOpen ? 'open' : ''} ${isSidebarCollapsed && section === 'coding' ? 'collapsed' : ''}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>Questions</h3>
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            {isSidebarCollapsed ? '→' : '←'}
                        </button>
                    </div>
                    <div className="nav-grid scrollable-content" style={{ flex: 1 }}>
                        {(section === 'mcq'
                            ? exam.questions.filter((q: any) => q.type === 'mcq')
                            : exam.questions.filter((q: any) => q.type === 'coding')
                        ).map((q: any, idx: number) => {
                            const originalIdx = exam.questions.findIndex((eq: any) => eq._id === q._id);
                            return (
                                <button
                                    key={q._id}
                                    className={`nav-btn ${currentQuestionIndex === originalIdx ? 'active' : ''} ${selectedAnswers[q._id] !== undefined ? 'answered' : ''}`}
                                    onClick={() => {
                                        navigateToQuestion(originalIdx);
                                        setIsMenuOpen(false);
                                    }}
                                >
                                    {idx + 1}
                                </button>
                            );
                        })}
                    </div>
                    {section === 'mcq' && exam.questions.some((q: any) => q.type === 'coding') && (exam.has_coding !== false) ? (
                        <button
                            className="btn btn-primary"
                            style={{ marginTop: '1rem', background: 'var(--warning)', borderColor: 'var(--warning)', color: 'black' }}
                            onClick={() => {
                                setShowSectionTransitionConfirm(true);
                            }}
                        >
                            Submit & Next Section
                        </button>
                    ) : (
                        <button className="btn btn-primary submit-btn" onClick={() => handleSubmissionRef.current?.()}>Submit Exam</button>
                    )}
                </aside>

                <main className={`question-area ${currentQuestion?.type === 'coding' ? 'split-view' : ''}`}>
                    {currentQuestion?.type === 'coding' ? (
                        <>
                            <div className="split-left scrollable-content" style={{ flex: `0 0 ${splitWidth}%` }}>
                                <div className="card question-card-split">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                                        <span className="question-type">Question {exam.questions.filter((q: any, i: number) => q.type === 'coding' && i <= currentQuestionIndex).length} (Coding)</span>
                                        <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Marks: {currentQuestion.marks}</span>
                                    </div>
                                    <div
                                        className="question-text-rich"
                                        dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
                                    />
                                    <div className="nav-actions-bottom" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-color)', zIndex: 10, borderTop: '1px solid var(--border-color)', margin: '2rem 0 0 0', padding: '1rem 0', display: 'flex', gap: '1rem' }}>
                                        <button
                                            className="btn btn-outline small"
                                            disabled={currentQuestionIndex === 0 || exam.questions[currentQuestionIndex - 1]?.type !== 'coding'}
                                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                                        >
                                            Previous
                                        </button>
                                        <button className="btn btn-primary small" onClick={() => {
                                            if (currentQuestionIndex < exam.questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
                                            else handleSubmissionRef.current?.();
                                        }}>{currentQuestionIndex === exam.questions.length - 1 ? 'Finish' : 'Next'}</button>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="gutter-horizontal"
                                onMouseDown={() => {
                                    isResizingWidth.current = true;
                                    document.body.style.cursor = 'col-resize';
                                }}
                            ></div>
                            <div className="split-right" style={{ flex: 1 }}>
                                <div className="editor-container-rich" style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)' }}>
                                    <div className="editor-header-rich" style={{ padding: '0.5rem 1rem', background: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                            >
                                                {isSidebarCollapsed ? '📑 Show Panel' : '📑 Hide Panel'}
                                            </button>
                                            <button
                                                className="btn btn-outline"
                                                style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                                                onClick={() => {
                                                    setShowResetCodeConfirm(true);
                                                }}
                                            >
                                                🔄 Reset Code
                                            </button>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600' }}>Language:</div>
                                                <select
                                                    value={selectedLanguage}
                                                    onChange={(e) => {
                                                        const newLang = e.target.value;
                                                        setSelectedLanguage(newLang);
                                                        setQuestionDrafts(prev => ({
                                                            ...prev,
                                                            [currentQuestion._id]: {
                                                                ...(prev[currentQuestion._id] || {}),
                                                                [newLang]: DEFAULT_LANGUAGE_CODE[newLang]
                                                            }
                                                        }));
                                                        const newAnswers = { ...selectedAnswers };
                                                        if (newAnswers[currentQuestion._id]) {
                                                            delete newAnswers[currentQuestion._id];
                                                            setSelectedAnswers(newAnswers);
                                                        }
                                                    }}
                                                    className="lang-select"
                                                >
                                                    <option value="c">C (GCC 9.2.0)</option>
                                                    <option value="cpp">C++ (GCC 9.2.0)</option>
                                                    <option value="python">Python 3</option>
                                                    <option value="java">Java 11</option>
                                                    <option value="javascript">JavaScript (Node 18)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="monaco-wrapper" style={{ flex: '1', borderBottom: '1px solid var(--border-color)', minHeight: '300px', position: 'relative' }}>
                                        <Editor
                                            height="100%"
                                            language={selectedLanguage === 'cpp' ? 'cpp' : selectedLanguage === 'c' ? 'c' : selectedLanguage}
                                            theme={theme}
                                            value={
                                                questionDrafts[currentQuestion._id]?.[selectedLanguage] ??
                                                (selectedAnswers[currentQuestion._id]?.language === selectedLanguage
                                                    ? selectedAnswers[currentQuestion._id].code
                                                    : DEFAULT_LANGUAGE_CODE[selectedLanguage])
                                            }
                                            onChange={(val) => {
                                                setQuestionDrafts(prev => ({
                                                    ...prev,
                                                    [currentQuestion._id]: {
                                                        ...(prev[currentQuestion._id] || {}),
                                                        [selectedLanguage]: val || ''
                                                    }
                                                }));
                                            }}
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                scrollBeyondLastLine: false,
                                                automaticLayout: true,
                                                lineNumbers: 'on',
                                                padding: { top: 10 },
                                                contextmenu: false,
                                                copyWithSyntaxHighlighting: false,
                                                dragAndDrop: false,
                                                links: false,
                                                scrollbar: {
                                                    vertical: 'visible',
                                                    horizontal: 'visible'
                                                },
                                                readOnly: submitted,
                                                quickSuggestions: false,
                                                suggestOnTriggerCharacters: false,
                                                parameterHints: { enabled: false },
                                                snippetSuggestions: 'none',
                                                wordBasedSuggestions: "off",
                                                folding: false,
                                                glyphMargin: false,
                                                lightbulb: { enabled: "off" as any }
                                            }}
                                            onMount={(editor) => {
                                                editor.onKeyDown((e) => {
                                                    // Block Ctrl+V, Cmd+V, Shift+Insert
                                                    if (((e.ctrlKey || e.metaKey) && e.keyCode === 52) || (e.shiftKey && e.keyCode === 45)) {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setTabSwitchWarning({ show: true, message: 'Paste is disabled in this exam.', isGeneric: true });
                                                    }
                                                    if ((e.ctrlKey || e.metaKey) && (e.keyCode === 33 || e.keyCode === 52 || e.keyCode === 31)) {
                                                        e.preventDefault();
                                                    }
                                                });
                                                editor.onDidPaste((e) => {
                                                    setTabSwitchWarning({ show: true, message: 'Paste is disabled in this exam.', isGeneric: true });
                                                });
                                            }}
                                        />
                                    </div>

                                    <div
                                        className="gutter-vertical"
                                        onMouseDown={() => {
                                            isResizingHeight.current = true;
                                            document.body.style.cursor = 'row-resize';
                                        }}
                                    ></div>
                                    <div className="execution-panel" style={{ height: `${testcaseHeight}%`, background: 'var(--card-bg)', borderTop: 'none', display: 'flex', flexDirection: 'column' }}>
                                        <div className="panel-header" style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '1.5rem', position: 'sticky', top: 0, zIndex: 10, background: 'var(--card-bg)' }}>
                                            <div style={{ color: 'var(--text-color)', fontWeight: '700', fontSize: '0.9rem' }}>Code Execution</div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ background: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: '8px' }}
                                                    onClick={() => runTestCases('run')}
                                                    disabled={isRunningExecution}
                                                >
                                                    {isRunningExecution && lastExecutionType === 'run' ? 'Running...' : '▶ Run Test Cases'}
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ background: 'var(--bg-color)', color: 'var(--primary)', borderColor: 'var(--primary)', fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: '8px' }}
                                                    onClick={() => runTestCases('submit')}
                                                    disabled={isRunningExecution}
                                                >
                                                    {isRunningExecution && lastExecutionType === 'submit' ? 'Submitting...' : '✔ Submit Solution'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="results-display" style={{ flex: 1, padding: '1rem', overflowY: 'auto', color: 'var(--text-color)', fontSize: '0.9rem' }}>
                                            {isRunningExecution && (
                                                <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
                                                    <div className="spinner" style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                                                    Executing against {lastExecutionType === 'run' ? 'public' : 'all'} test cases...
                                                </div>
                                            )}

                                            {compilationError && (
                                                <div style={{ background: 'rgba(248, 81, 73, 0.1)', border: '1px solid rgba(248, 81, 73, 0.2)', padding: '1rem', borderRadius: '6px', color: '#f85149', marginBottom: '1rem' }}>
                                                    <div style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span>✖ Compilation Error</span>
                                                    </div>
                                                    <pre style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                                        {compilationError}
                                                    </pre>
                                                </div>
                                            )}

                                            {(currentQuestion.test_cases?.filter((tc: any) => !tc.is_hidden).length > 0) && (
                                                <div className="test-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Public Test Cases</h4>
                                                        {executionResults && (
                                                            <span style={{
                                                                padding: '0.2rem 0.6rem',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                background: executionResults.every((r: any) => r.passed) ? 'rgba(35, 134, 54, 0.2)' : 'rgba(240, 43, 64, 0.2)',
                                                                color: executionResults.every((r: any) => r.passed) ? '#3fb950' : '#f85149'
                                                            }}>
                                                                {executionResults.filter((r: any) => r.passed).length} / {executionResults.length} Passed
                                                            </span>
                                                        )}
                                                    </div>

                                                    {currentQuestion.test_cases.filter((tc: any) => !tc.is_hidden).map((tc: any, idx: number) => {
                                                        const result = executionResults ? (
                                                            lastExecutionType === 'run'
                                                                ? executionResults[idx]
                                                                : executionResults.find((r: any) => r.input === tc.input)
                                                        ) : null;

                                                        return (
                                                            <div key={idx} style={{
                                                                background: 'var(--secondary)',
                                                                borderRadius: '8px',
                                                                padding: '0.85rem',
                                                                border: `1px solid ${result ? (result.passed ? 'rgba(63, 185, 80, 0.3)' : 'rgba(217, 48, 37, 0.3)') : 'var(--border-color)'}`,
                                                                boxShadow: 'var(--card-shadow)'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                                    <span style={{ fontWeight: '600', fontSize: '0.8rem' }}>Test Case {idx + 1}</span>
                                                                    {result && (
                                                                        <span style={{ color: result.passed ? '#3fb950' : '#f85149', fontSize: '0.8rem' }}>
                                                                            {result.passed ? '● Passed' : '✖ Failed'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.75rem' }}>
                                                                    <div>
                                                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600' }}>Input</div>
                                                                        <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--input-bg)', borderRadius: '6px', overflowX: 'auto', border: '1px solid var(--border-color)' }}>{tc.input || 'N/A'}</pre>
                                                                    </div>
                                                                    <div>
                                                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600' }}>Expected Output</div>
                                                                        <pre style={{ margin: 0, padding: '0.5rem', background: 'var(--input-bg)', borderRadius: '6px', overflowX: 'auto', border: '1px solid var(--border-color)' }}>{tc.expected_output}</pre>
                                                                    </div>
                                                                    <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                                                                        <div style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem', fontWeight: '600' }}>Actual Output</div>
                                                                        <pre style={{
                                                                            margin: 0,
                                                                            padding: '0.6rem',
                                                                            background: result ? (result.passed ? 'rgba(63, 185, 80, 0.08)' : 'rgba(217, 48, 37, 0.08)') : 'var(--input-bg)',
                                                                            borderRadius: '6px',
                                                                            color: result ? (result.passed ? '#1a7f37' : 'var(--danger)') : 'var(--text-color)',
                                                                            border: `1px solid ${result ? (result.passed ? 'rgba(63, 185, 80, 0.2)' : 'rgba(217, 48, 37, 0.2)') : 'var(--border-color)'}`,
                                                                            whiteSpace: 'pre-wrap',
                                                                            fontFamily: 'monospace',
                                                                            minHeight: '1.5rem'
                                                                        }}>
                                                                            {result ? (result.error || result.actual) : 'Wait for execution...'}
                                                                        </pre>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card question-card scrollable-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <span className="question-type">Question {exam.questions.filter((q: any, i: number) => q.type === 'mcq' && i <= currentQuestionIndex).length} (MCQ)</span>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>Marks: {currentQuestion.marks}</span>
                            </div>

                            <div
                                className="question-text"
                                style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}
                                dangerouslySetInnerHTML={{ __html: currentQuestion.question_text }}
                            />

                            {currentQuestion.type === 'mcq' && (
                                <div className="options-list">
                                    {currentQuestion.options.map((opt: string, idx: number) => (
                                        <label key={idx} className={`option-item ${selectedAnswers[currentQuestion._id] === idx ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name={`question-${currentQuestion._id}`}
                                                checked={selectedAnswers[currentQuestion._id] === idx}
                                                onChange={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestion._id]: idx })}
                                                style={{ display: 'none' }}
                                            />
                                            <span className="radio-circle"></span>
                                            <span className="option-text">{opt}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {currentQuestion.type === 'descriptive' && (
                                <textarea
                                    className="form-control"
                                    rows={10}
                                    placeholder="Type your answer here..."
                                    value={selectedAnswers[currentQuestion._id] || ''}
                                    onChange={(e) => setSelectedAnswers({ ...selectedAnswers, [currentQuestion._id]: e.target.value })}
                                />
                            )}

                            <div className="action-footer" style={{ position: 'sticky', bottom: 0, background: 'var(--card-bg)', zIndex: 10, marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '1rem 0', margin: '2.5rem 0 0 0' }}>
                                <button className="btn btn-outline" disabled={currentQuestionIndex === 0} onClick={() => navigateToQuestion(currentQuestionIndex - 1)}>Previous</button>
                                {section === 'mcq' && currentQuestionIndex === exam.questions.filter((q: any) => q.type === 'mcq').length - 1 && exam.questions.some((q: any) => q.type === 'coding') && (exam.has_coding !== false) ? (
                                    <button
                                        className="btn btn-primary"
                                        style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: 'black' }}
                                        onClick={() => {
                                            setShowSectionTransitionConfirm(true);
                                        }}
                                    >
                                        Submit MCQs & Start Coding
                                    </button>
                                ) : (
                                    <button className="btn btn-primary" onClick={() => {
                                        if (currentQuestionIndex < exam.questions.length - 1) navigateToQuestion(currentQuestionIndex + 1);
                                        else handleSubmissionRef.current?.();
                                    }}>{currentQuestionIndex === exam.questions.length - 1 ? 'Finish' : (section === 'mcq' ? 'Next Question' : 'Next')}</button>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {tabSwitchWarning && tabSwitchWarning.show && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: tabSwitchWarning.isDisqualified ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card fade-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                        {!tabSwitchWarning.isGeneric && <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>}

                        <h2 style={{ color: 'var(--text-color)', marginBottom: '1rem', fontSize: '1.4rem' }}>
                            {tabSwitchWarning.isDisqualified ? "Exam Auto-Submitting" :
                                (tabSwitchWarning.isGeneric ? "Notification" : "Tab Switch Detected")}
                        </h2>

                        <div style={{ background: tabSwitchWarning.isGeneric ? 'rgba(56, 139, 253, 0.05)' : 'rgba(217, 48, 37, 0.05)', border: tabSwitchWarning.isGeneric ? '1px solid rgba(56, 139, 253, 0.2)' : '1px solid rgba(217, 48, 37, 0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
                            {!tabSwitchWarning.isGeneric && <p style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Anti-Cheat Rules</p>}
                            <p style={{ color: 'var(--text-color)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                                {tabSwitchWarning.message}
                            </p>
                        </div>

                        {!tabSwitchWarning.isDisqualified && (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="btn btn-primary" style={{ flex: 1, background: tabSwitchWarning.isGeneric ? 'var(--primary)' : 'var(--danger)', borderColor: tabSwitchWarning.isGeneric ? 'var(--primary)' : 'var(--danger)' }} onClick={() => setTabSwitchWarning(null)}>
                                    OK
                                </button>
                            </div>
                        )}
                        {tabSwitchWarning.isDisqualified && (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Redirecting automatically...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showSectionTransitionConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card fade-in" style={{ maxWidth: '500px', width: '90%', padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                        <h2 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>Submit MCQ Section?</h2>

                        <div style={{ background: 'rgba(217, 48, 37, 0.05)', border: '1px solid rgba(217, 48, 37, 0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <p style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Warning</p>
                            <p style={{ color: 'var(--text-color)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                                You are about to submit the MCQ section and proceed to the Coding section. <strong>You cannot return to the MCQs after this point.</strong>
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowSectionTransitionConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--warning)', borderColor: 'var(--warning)', color: 'black' }} onClick={() => {
                                setShowSectionTransitionConfirm(false);
                                startCodingSection(false);
                            }}>
                                Submit & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showFinalSubmitConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card fade-in" style={{ maxWidth: '500px', width: '90%', padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚀</div>
                        <h2 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>Final Submission?</h2>

                        <div style={{ background: 'rgba(56, 139, 253, 0.05)', border: '1px solid rgba(56, 139, 253, 0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <p style={{ color: 'var(--primary)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>ℹ️ Confirmation</p>
                            <p style={{ color: 'var(--text-color)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                                Are you sure you want to finish the exam? This will submit all your answers for final evaluation.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowFinalSubmitConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                                setShowFinalSubmitConfirm(false);
                                handleSubmissionRef.current?.(false);
                            }}>
                                Yes, Submit Exam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showResetCodeConfirm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: 'rgba(0,0,0,0.5)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="card fade-in" style={{ maxWidth: '400px', width: '90%', padding: '2rem', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
                        <h2 style={{ color: 'var(--text-color)', marginBottom: '1.5rem' }}>Reset Code?</h2>

                        <div style={{ background: 'rgba(217, 48, 37, 0.05)', border: '1px solid rgba(217, 48, 37, 0.2)', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem', textAlign: 'left' }}>
                            <p style={{ color: 'var(--danger)', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Warning</p>
                            <p style={{ color: 'var(--text-color)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
                                Are you sure you want to reset your code to the default template? This will erase all your changes for the current language.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowResetCodeConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                                setShowResetCodeConfirm(false);
                                setQuestionDrafts(prev => ({
                                    ...prev,
                                    [currentQuestion._id]: {
                                        ...(prev[currentQuestion._id] || {}),
                                        [selectedLanguage]: DEFAULT_LANGUAGE_CODE[selectedLanguage]
                                    }
                                }));

                                if (selectedAnswers[currentQuestion._id]?.language === selectedLanguage) {
                                    const newAnswers = { ...selectedAnswers };
                                    delete newAnswers[currentQuestion._id];
                                    setSelectedAnswers(newAnswers);
                                }
                            }}>
                                Reset Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
