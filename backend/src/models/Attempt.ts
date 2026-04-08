import mongoose, { Document, Schema } from 'mongoose';

export interface IAnswer {
    question_id: mongoose.Types.ObjectId;
    selected_option?: number; // for mcq
    code_submitted?: string; // for coding
    language?: string; // language for coding questions
    text_answer?: string; // for descriptive
    file_url?: string; // for file upload
    marks_obtained: number;
    evaluated: boolean;
}

export interface IAttempt extends Document {
    student_id: mongoose.Types.ObjectId;
    exam_id: mongoose.Types.ObjectId;
    tab_switch_count: number;
    auto_submitted: boolean;
    obtained_marks: number;
    status: 'ongoing' | 'submitted' | 'evaluated' | 'disqualified';
    last_question_index: number;
    remaining_time: number; // in seconds
    time_taken: number; // in seconds
    answers: IAnswer[];
}

const answerSchema = new Schema<IAnswer>({
    question_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    selected_option: { type: Number },
    code_submitted: { type: String },
    language: { type: String },
    text_answer: { type: String },
    file_url: { type: String },
    marks_obtained: { type: Number, default: 0 },
    evaluated: { type: Boolean, default: false },
});

const attemptSchema = new Schema<IAttempt>(
    {
        student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        exam_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
        tab_switch_count: { type: Number, default: 0 },
        auto_submitted: { type: Boolean, default: false },
        obtained_marks: { type: Number, default: 0 },
        status: { type: String, enum: ['ongoing', 'submitted', 'evaluated', 'disqualified'], default: 'ongoing' },
        last_question_index: { type: Number, default: 0 },
        remaining_time: { type: Number, default: 0 },
        time_taken: { type: Number, default: 0 },
        answers: [answerSchema],
    },
    { timestamps: true }
);

attemptSchema.index({ exam_id: 1 });
attemptSchema.index({ student_id: 1 });

const Attempt = mongoose.model<IAttempt>('Attempt', attemptSchema);
export default Attempt;
