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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const questionSchema = new mongoose_1.Schema({
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
const examSchema = new mongoose_1.Schema({
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
    created_by: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
// Cascade delete attempts when an exam is deleted
examSchema.pre('deleteOne', { document: true, query: false }, function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield mongoose_1.default.model('Attempt').deleteMany({ exam_id: this._id });
    });
});
const Exam = mongoose_1.default.model('Exam', examSchema);
exports.default = Exam;
