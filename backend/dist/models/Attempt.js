"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const answerSchema = new mongoose_1.Schema({
    question_id: { type: mongoose_1.default.Schema.Types.ObjectId, required: true },
    selected_option: { type: Number },
    code_submitted: { type: String },
    language: { type: String },
    text_answer: { type: String },
    file_url: { type: String },
    marks_obtained: { type: Number, default: 0 },
    evaluated: { type: Boolean, default: false },
});
const attemptSchema = new mongoose_1.Schema({
    student_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    exam_id: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Exam', required: true },
    tab_switch_count: { type: Number, default: 0 },
    auto_submitted: { type: Boolean, default: false },
    obtained_marks: { type: Number, default: 0 },
    status: { type: String, enum: ['ongoing', 'submitted', 'evaluated', 'disqualified'], default: 'ongoing' },
    last_question_index: { type: Number, default: 0 },
    remaining_time: { type: Number, default: 0 },
    time_taken: { type: Number, default: 0 },
    answers: [answerSchema],
}, { timestamps: true });
attemptSchema.index({ exam_id: 1 });
attemptSchema.index({ student_id: 1 });
const Attempt = mongoose_1.default.model('Attempt', attemptSchema);
exports.default = Attempt;
