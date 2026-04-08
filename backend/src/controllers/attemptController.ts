import { Response } from 'express';
import Attempt from '../models/Attempt';
import Exam from '../models/Exam';
import { AuthRequest } from '../middleware/authMiddleware';
import { evaluateCodingQuestion } from '../utils/sandboxHelper';

// @desc    Start exam attempt
// @route   POST /api/attempts/start/:examId
// @access  Private/Student
export const startAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const examId = req.params.examId;
        const studentId = req.user?._id;

        const existingAttempt = await Attempt.findOne({ exam_id: examId, student_id: studentId });
        if (existingAttempt) {
            return res.status(200).json({
                message: 'You have already started or completed this exam.',
                attempt: existingAttempt
            });
        }

        const exam = await Exam.findById(examId);

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const attempt = new Attempt({
            exam_id: examId,
            student_id: studentId,
            status: 'ongoing',
            // Initialize remaining_time with the FIRST section's duration, not total exam duration
            remaining_time: exam.has_mcq && exam.mcq_duration
                ? exam.mcq_duration * 60
                : (exam.has_coding && exam.coding_duration ? exam.coding_duration * 60 : (exam.duration || 60) * 60),
            answers: [],
        });

        const newAttempt = await attempt.save();
        res.status(201).json(newAttempt);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete exam attempt
// @route   DELETE /api/attempts/:attemptId
// @access  Private/Admin or Faculty
export const deleteAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const attempt = await Attempt.findById(req.params.attemptId);

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        // Only faculty or admin can delete
        if (req.user?.role !== 'admin' && req.user?.role !== 'faculty') {
            return res.status(403).json({ message: 'Not authorized to delete results' });
        }

        await Attempt.findByIdAndDelete(req.params.attemptId);
        res.json({ message: 'Attempt deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Report tab switch
// @route   POST /api/attempts/:attemptId/violation
// @access  Private/Student
export const reportViolation = async (req: AuthRequest, res: Response) => {
    try {
        const { time_taken } = req.body;
        const attempt = await Attempt.findById(req.params.attemptId).populate('exam_id');

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (attempt.student_id.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        attempt.tab_switch_count += 1;
        if (time_taken !== undefined) {
            attempt.time_taken = time_taken;
        }

        const exam: any = attempt.exam_id;

        if (attempt.tab_switch_count >= exam.tab_switch_limit && exam.auto_submit) {
            attempt.status = 'disqualified';
            attempt.auto_submitted = true;
        }

        await attempt.save();
        res.json(attempt);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Submit answers
// @route   POST /api/attempts/:attemptId/submit
// @access  Private/Student
export const submitAttempt = async (req: AuthRequest, res: Response) => {
    try {
        const { answers, time_taken } = req.body;
        const attempt = await Attempt.findById(req.params.attemptId);

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (attempt.status !== 'ongoing' && attempt.status !== 'disqualified') {
            return res.status(400).json({ message: 'Exam already evaluated or submitted' });
        }

        const exam = await Exam.findById(attempt.exam_id);
        if (!exam) {
            return res.status(404).json({ message: 'Associated exam not found' });
        }

        let totalObtainedMarks = 0;
        const evaluatedAnswers = await Promise.all(answers.map(async (ans: any) => {
            const question = exam.questions.find(q => (q as any)._id.toString() === ans.question_id.toString());
            let marksForThisQuestion = 0;

            if (question) {
                if (question.type === 'mcq') {
                    if (ans.selected_option === question.correct_option) {
                        marksForThisQuestion = question.marks || 0;
                    }
                } else if (question.type === 'coding') {
                    // Actual sandbox evaluation
                    if (ans.code_submitted && ans.language && question.test_cases && question.test_cases.length > 0) {
                        try {
                            const passedCount = await evaluateCodingQuestion(ans.language, ans.code_submitted, question.test_cases);
                            const totalCases = question.test_cases.length;
                            marksForThisQuestion = (passedCount / totalCases) * (question.marks || 0);
                        } catch (err) {
                            console.error("Auto-grade failed:", err);
                        }
                    }
                } else if (question.type === 'descriptive') {
                    // Award 50% marks for any descriptive answer over 10 chars for immediate result
                    if (ans.text_answer && ans.text_answer.trim().length > 10) {
                        marksForThisQuestion = (question.marks || 0) * 0.5;
                    }
                }
            }

            totalObtainedMarks += marksForThisQuestion;
            return {
                ...ans,
                marks_obtained: marksForThisQuestion,
                evaluated: true
            };
        }));

        attempt.answers = evaluatedAnswers;
        attempt.obtained_marks = totalObtainedMarks;

        if (time_taken !== undefined) {
            attempt.time_taken = time_taken;
        }

        // If it was disqualified due to tab switch, keep it disqualified. Otherwise mark as evaluated.
        if (attempt.status !== 'disqualified') {
            attempt.status = 'evaluated';
        }

        await attempt.save();

        res.json({
            message: 'Exam submitted and evaluated successfully',
            attempt
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all results for an exam (Admin)
// @route   GET /api/attempts/results/exam/:examId
// @access  Private/Admin
export const getAllResults = async (req: AuthRequest, res: Response) => {
    try {
        const { examId } = req.params;
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const attempts = await Attempt.find({ exam_id: examId, status: { $in: ['evaluated', 'disqualified', 'submitted'] } })
            .populate('student_id', 'name email department year registration_number');

        // Calculate total possible marks
        const totalPossibleMarks = exam.questions.reduce((acc, q) => acc + (q.marks || 0), 0);

        // Separate MCQ and coding marks
        const mcqMax = exam.questions.filter(q => q.type === 'mcq').reduce((acc, q) => acc + (q.marks || 0), 0);
        const codingMax = exam.questions.filter(q => q.type === 'coding').reduce((acc, q) => acc + (q.marks || 0), 0);

        // Filter out attempts where student no longer exists
        const validAttempts = attempts.filter(a => a.student_id);

        const results = validAttempts.map(attempt => {
            const score = attempt.obtained_marks;
            const percentage = totalPossibleMarks > 0 ? Math.min((score / totalPossibleMarks) * 100, 100) : 0;

            // Calculate per-category scores
            const mcqObtained = attempt.answers
                .filter((ans: any) => {
                    const q = exam.questions.find(q => (q as any)._id.toString() === ans.question_id.toString());
                    return q && q.type === 'mcq';
                })
                .reduce((acc: number, ans: any) => acc + (ans.marks_obtained || 0), 0);

            const codingObtained = attempt.answers
                .filter((ans: any) => {
                    const q = exam.questions.find(q => (q as any)._id.toString() === ans.question_id.toString());
                    return q && q.type === 'coding';
                })
                .reduce((acc: number, ans: any) => acc + (ans.marks_obtained || 0), 0);

            const mcqPercent = mcqMax > 0 ? Math.min((mcqObtained / mcqMax) * 100, 100) : null;
            const codingPercent = codingMax > 0 ? Math.min((codingObtained / codingMax) * 100, 100) : null;

            // Qualification Logic: 40% in each module if that module exists
            let isQualified = true;
            if (mcqMax > 0 && (mcqPercent === null || mcqPercent < 40)) isQualified = false;
            if (codingMax > 0 && (codingPercent === null || codingPercent < 40)) isQualified = false;

            const qualificationStatus = isQualified ? 'Qualified' : 'Disqualified';

            return {
                _id: attempt._id,
                student: attempt.student_id,
                obtained_marks: score,
                total_marks: totalPossibleMarks,
                percentage: percentage.toFixed(1),
                mcq_percent: mcqPercent !== null ? mcqPercent.toFixed(1) : null,
                coding_percent: codingPercent !== null ? codingPercent.toFixed(1) : null,
                tab_switch_count: attempt.tab_switch_count,
                status: attempt.status,
                qualification_status: qualificationStatus,
                submitted_at: (attempt as any).updatedAt,
                time_taken: attempt.time_taken || 0,
                auto_submitted: attempt.auto_submitted
            };
        });

        res.json({
            exam_title: exam.title,
            total_marks: totalPossibleMarks,
            results
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in student's results
// @route   GET /api/attempts/results/my
// @access  Private/Student
export const getMyResults = async (req: AuthRequest, res: Response) => {
    try {
        const studentId = req.user?._id;
        const attempts = await Attempt.find({ student_id: studentId, status: { $in: ['evaluated', 'disqualified', 'submitted'] } })
            .populate('exam_id', 'title start_time questions');

        const results = attempts.map(attempt => {
            const exam: any = attempt.exam_id;
            const totalPossibleMarks = exam?.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 0;
            const percentage = totalPossibleMarks > 0 ? Math.min((attempt.obtained_marks / totalPossibleMarks) * 100, 100) : 0;

            return {
                _id: attempt._id,
                exam_title: exam?.title,
                obtained_marks: attempt.obtained_marks,
                total_marks: totalPossibleMarks,
                percentage: percentage.toFixed(2),
                status: attempt.status,
                date: (attempt as any).updatedAt
            };
        });

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get global analytics for dashboard (Admin)
// @route   GET /api/attempts/analytics/global
// @access  Private/Admin
export const getGlobalAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const totalAttempts = await Attempt.countDocuments();
        const evaluatedAttempts = await Attempt.find({ status: { $in: ['evaluated', 'disqualified', 'submitted'] } }).populate('exam_id', 'questions');

        const totalStudents = await Attempt.distinct('student_id');

        // Active students today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeToday = await Attempt.distinct('student_id', {
            createdAt: { $gte: today }
        });

        // Weekly Activity (Last 7 days)
        const weeklyActivity = [0, 0, 0, 0, 0, 0, 0];
        const weeklyLabels = ['', '', '', '', '', '', ''];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 0; i < 7; i++) {
            const startOfDay = new Date(today);
            startOfDay.setDate(startOfDay.getDate() - (6 - i));

            const endOfDay = new Date(startOfDay);
            endOfDay.setDate(startOfDay.getDate() + 1);

            const activeOnDay = await Attempt.distinct('student_id', {
                createdAt: { $gte: startOfDay, $lt: endOfDay }
            });
            weeklyActivity[i] = activeOnDay.length;
            weeklyLabels[i] = dayNames[startOfDay.getDay()];
        }

        let totalScoreSum = 0;
        let totalPossibleSum = 0;

        // Performance Distribution
        let lessThan50 = 0;
        let between50And70 = 0;
        let between70And90 = 0;
        let above90 = 0;

        evaluatedAttempts.forEach(attempt => {
            const exam: any = attempt.exam_id;
            const totalPossible = exam?.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 0;

            const score = attempt.obtained_marks || 0;
            const percentage = totalPossible > 0 ? Math.min((score / totalPossible) * 100, 100) : 0;

            if (percentage < 50) lessThan50++;
            else if (percentage < 70) between50And70++;
            else if (percentage < 90) between70And90++;
            else above90++;

            totalScoreSum += percentage;
            totalPossibleSum += 1;
        });

        const performanceDistribution = [lessThan50, between50And70, between70And90, above90];

        const averageScore = totalPossibleSum > 0 ? (totalScoreSum / totalPossibleSum) : 0;
        const completionRate = totalAttempts > 0 ? (evaluatedAttempts.length / totalAttempts) * 100 : 0;

        // Recent Assessments Summary (Last 10)
        const recentExams = await Exam.find().sort({ createdAt: -1 }).limit(10);
        const recentAssessmentsSummary = await Promise.all(recentExams.map(async (exam) => {
            const attempts = await Attempt.find({ exam_id: exam._id, status: { $in: ['evaluated', 'disqualified', 'submitted'] } });
            const totalAttempts = attempts.length;

            // Re-calculate qualification for summary
            const mcqMax = exam.questions.filter(q => q.type === 'mcq').reduce((acc, q) => acc + (q.marks || 0), 0);
            const codingMax = exam.questions.filter(q => q.type === 'coding').reduce((acc, q) => acc + (q.marks || 0), 0);
            const totalPossibleMarks = exam.questions.reduce((acc, q) => acc + (q.marks || 0), 0);

            let qualifiedCount = 0;
            attempts.forEach(attempt => {
                const mcqObtained = attempt.answers
                    .filter((ans: any) => {
                        const q = exam.questions.find(q => (q as any)._id.toString() === ans.question_id.toString());
                        return q && q.type === 'mcq';
                    })
                    .reduce((acc: number, ans: any) => acc + (ans.marks_obtained || 0), 0);

                const codingObtained = attempt.answers
                    .filter((ans: any) => {
                        const q = exam.questions.find(q => (q as any)._id.toString() === ans.question_id.toString());
                        return q && q.type === 'coding';
                    })
                    .reduce((acc: number, ans: any) => acc + (ans.marks_obtained || 0), 0);

                const mcqPercent = mcqMax > 0 ? (mcqObtained / mcqMax) * 100 : 100;
                const codingPercent = codingMax > 0 ? (codingObtained / codingMax) * 100 : 100;

                if (mcqPercent >= 40 && codingPercent >= 40) {
                    qualifiedCount++;
                }
            });

            const disqualifiedCount = totalAttempts - qualifiedCount;
            const qualifiedPercent = totalAttempts > 0 ? ((qualifiedCount / totalAttempts) * 100).toFixed(1) : '0.0';
            const disqualifiedPercent = totalAttempts > 0 ? ((disqualifiedCount / totalAttempts) * 100).toFixed(1) : '0.0';

            return {
                title: exam.title,
                totalAttempts,
                qualifiedCount,
                qualifiedPercent,
                disqualifiedCount,
                disqualifiedPercent
            };
        }));

        res.json({
            totalAssessments: totalAttempts,
            averageScore: averageScore.toFixed(1),
            activeUsersToday: activeToday.length,
            completionRate: completionRate.toFixed(1),
            totalStudentsCount: totalStudents.length,
            weeklyActivity,
            weeklyLabels,
            performanceDistribution,
            recentAssessmentsSummary
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get overall student performance across all exams
// @route   GET /api/attempts/results/overall
// @access  Private/Admin
export const getOverallResults = async (req: AuthRequest, res: Response) => {
    try {
        const attempts = await Attempt.find({ status: { $in: ['evaluated', 'disqualified', 'submitted'] } })
            .populate('student_id', 'name email department year registration_number')
            .populate('exam_id', 'title questions');

        const studentMap = new Map();

        attempts.forEach(attempt => {
            const student: any = attempt.student_id;
            if (!student) return;

            const studentId = student._id.toString();
            const exam: any = attempt.exam_id;
            const totalPossible = exam?.questions?.reduce((acc: number, q: any) => acc + (q.marks || 0), 0) || 0;
            const score = attempt.obtained_marks || 0;
            const percentage = totalPossible > 0 ? Math.min((score / totalPossible) * 100, 100) : 0;

            if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                    student,
                    totalExams: 0,
                    totalPercentage: 0,
                    totalObtained: 0,
                    totalPossible: 0,
                    exams: []
                });
            }

            const stats = studentMap.get(studentId);
            stats.totalExams += 1;
            stats.totalPercentage += percentage;
            stats.totalObtained += score;
            stats.totalPossible += totalPossible;
            stats.exams.push({
                exam_title: exam?.title,
                score,
                totalPossible,
                percentage: percentage.toFixed(1),
                date: (attempt as any).updatedAt
            });
        });

        const results = Array.from(studentMap.values()).map(stats => {
            const avgPercentage = stats.totalExams > 0 ? (stats.totalPercentage / stats.totalExams) : 0;
            return {
                student: stats.student,
                totalAssessments: stats.totalExams,
                exams: stats.exams.map((e: any) => e.exam_title),
                averagePercentage: avgPercentage.toFixed(1),
                totalMarks: `${stats.totalObtained} / ${stats.totalPossible}`,
                lastAttemptDate: stats.exams.length > 0 ? stats.exams[stats.exams.length - 1].date : null
            };
        });

        res.json(results);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Save exam progress (Auto-save)
// @route   POST /api/attempts/:attemptId/save
// @access  Private/Student
export const saveProgress = async (req: AuthRequest, res: Response) => {
    try {
        const { last_question_index, remaining_time, time_taken, answers } = req.body;
        const attempt = await Attempt.findById(req.params.attemptId);

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        if (attempt.student_id.toString() !== req.user?._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        if (attempt.status !== 'ongoing') {
            return res.status(400).json({ message: 'Exam is no longer active' });
        }

        if (last_question_index !== undefined) attempt.last_question_index = last_question_index;
        if (remaining_time !== undefined) attempt.remaining_time = remaining_time;
        if (time_taken !== undefined) attempt.time_taken = time_taken;
        if (answers) {
            // Merge or replace answers? Replace is easier for "auto-save all"
            // But we might want to preserve marks if partially evaluated? 
            // In auto-save, we only care about the student's input.
            attempt.answers = answers;
        }

        await attempt.save();
        res.json({ message: 'Progress saved successfully', attempt });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
