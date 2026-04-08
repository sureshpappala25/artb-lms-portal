import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestion {
    question_text: string;
    type: 'mcq' | 'coding' | 'descriptive' | 'file';
    options?: string[]; // for mcq
    correct_option?: number; // index of correct option
    test_cases?: { input: string; expected_output: string; is_hidden?: boolean }[]; // for coding
    marks: number;
}

export interface IExam extends Document {
    title: string;
    description: string;
    start_time: Date;
    end_time: Date;
    tab_switch_limit: number;
    answer_reveal_mode: 'immediate' | 'after_exam' | 'manual';
    auto_submit: boolean;
    questions: IQuestion[];
    target_years: number[]; // e.g. [1, 2]
    target_year?: number; // legacy support
    departments: string[]; // e.g. ['CSE', 'ECE']
    duration: number; // in minutes (total duration fallback)
    has_mcq: boolean;
    has_coding: boolean;
    mcq_duration: number;
    coding_duration: number;
    created_by: mongoose.Types.ObjectId;
}

const questionSchema = new Schema<IQuestion>({
    question_text: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'coding', 'descriptive', 'file'], required: true },
    options: [{ type: String }],
    correct_option: { type: Number },
    test_cases: [
        {
            input: { type: String },
            expected_output: { type: String },
            is_hidden: { type: Boolean, default: false },
        },
    ],
    marks: { type: Number, required: true, default: 1 },
});

const examSchema = new Schema<IExam>(
    {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        start_time: { type: Date, required: true },
        end_time: { type: Date, required: true },
        tab_switch_limit: { type: Number, required: true, default: 2 },
        answer_reveal_mode: { type: String, enum: ['immediate', 'after_exam', 'manual'], default: 'after_exam' },
        auto_submit: { type: Boolean, default: true },
        questions: [questionSchema],
        target_years: [{ type: Number, enum: [1, 2, 3, 4] }],
        target_year: { type: Number }, // legacy
        departments: [{ type: String }], // empty means all departments
        duration: { type: Number, required: true, default: 60 }, // in minutes
        has_mcq: { type: Boolean, default: true },
        has_coding: { type: Boolean, default: true },
        mcq_duration: { type: Number, default: 30 },
        coding_duration: { type: Number, default: 30 },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

// Cascade delete attempts when an exam is deleted
examSchema.pre('deleteOne', { document: true, query: false }, async function (this: any) {
    await mongoose.model('Attempt').deleteMany({ exam_id: this._id });
});

const Exam = mongoose.model<IExam>('Exam', examSchema);
export default Exam;
