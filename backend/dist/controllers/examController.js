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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExam = exports.updateExam = exports.generateFromDoc = exports.getExamById = exports.createExam = exports.getExams = void 0;
const Exam_1 = __importDefault(require("../models/Exam"));
const genai_1 = require("@google/genai");
const fs_1 = __importDefault(require("fs"));
const mammoth_1 = __importDefault(require("mammoth"));
const xlsx = __importStar(require("xlsx"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseFn = require('pdf-parse').default || require('pdf-parse');
// @desc    Get all exams
// @route   GET /api/exams
// @access  Public (in real life Student/Faculty/Admin)
const getExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exams = yield Exam_1.default.find({});
        // Depending on role, we might filter fields (students shouldn't see test cases)
        res.json(exams);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExams = getExams;
// @desc    Create an exam
// @route   POST /api/exams
// @access  Private/Admin
const createExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, description, start_time, end_time, tab_switch_limit, answer_reveal_mode, auto_submit, questions, target_year, target_years, departments, duration, has_mcq, has_coding, mcq_duration, coding_duration, } = req.body;
        const exam = new Exam_1.default({
            title,
            description,
            start_time,
            end_time,
            tab_switch_limit,
            answer_reveal_mode,
            auto_submit,
            questions,
            target_years: target_years || (target_year ? [target_year] : [1]),
            departments: departments || [],
            duration: duration || 60,
            has_mcq: has_mcq !== undefined ? has_mcq : true,
            has_coding: has_coding !== undefined ? has_coding : true,
            mcq_duration: mcq_duration !== undefined ? mcq_duration : 30,
            coding_duration: coding_duration !== undefined ? coding_duration : 30,
            created_by: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
        });
        const createdExam = yield exam.save();
        res.status(201).json(createdExam);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.createExam = createExam;
// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Public (or specific role)
const getExamById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exam = yield Exam_1.default.findById(req.params.id);
        if (exam) {
            res.json(exam);
        }
        else {
            res.status(404).json({ message: 'Exam not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.getExamById = getExamById;
// @desc    Generate Questions from Document
// @route   POST /api/exams/generate-from-doc
// @access  Private/Faculty or Admin
const generateFromDoc = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document uploaded' });
        }
        let documentText = '';
        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs_1.default.readFileSync(req.file.path);
            const data = yield pdfParseFn(dataBuffer);
            documentText = data.text;
        }
        else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            req.file.originalname.endsWith('.docx') ||
            req.file.originalname.endsWith('.doc')) {
            const result = yield mammoth_1.default.convertToHtml({ path: req.file.path });
            documentText = result.value;
        }
        else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            req.file.mimetype === 'application/vnd.ms-excel' ||
            req.file.originalname.endsWith('.xlsx') ||
            req.file.originalname.endsWith('.xls')) {
            const workbook = xlsx.readFile(req.file.path);
            let combinedText = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                combinedText += xlsx.utils.sheet_to_txt(sheet) + '\n';
            });
            documentText = combinedText;
        }
        else if (req.file.mimetype === 'text/plain') {
            documentText = fs_1.default.readFileSync(req.file.path, 'utf8');
        }
        else {
            return res.status(400).json({ message: 'Unsupported file format. Please upload PDF, DOCX, XLSX, XLS, or TXT.' });
        }
        // Clean up temporary uploaded file from multer
        fs_1.default.unlinkSync(req.file.path);
        const aiProvider = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `
            Analyze the following text from an uploaded document (this could be HTML from a Word file, or raw text from a PDF/Excel sheet).
            Extract ALL relevant exam questions found in the text. Do not limit the count to 5; extract everything that looks like a valid question.
            
            CRITICAL FORMATTING INSTRUCTIONS:
            If a question contains code snippets, programming questions, code examples, or images, YOU MUST PRESERVE THEM EXACTLY in the "question_text".
            - Do not flatten or remove code formatting.
            - If the input contains HTML tags like <pre>, <code>, <img>, or basic formatting (<b>, <i>, <p>, <ul>), KEEP THEM intact in the "question_text".
            - For raw text inputs without HTML (like PDFs), intelligently wrap any detected code snippets in markdown backticks (\`\`\`) to preserve indentation and structure.
            - Images (<img>) must be retained exactly as they appear in the HTML source.

            Focus on two types of questions:
            1. Multiple Choice Questions (MCQs): Look for questions with 4 options.
            2. Coding Problems: Look for programming tasks, algorithmic challenges, or function implementation requests.

            For each question, return it in the following JSON format:
            
            For MCQs:
            {
              "question_text": "...",
              "type": "mcq",
              "options": ["A", "B", "C", "D"],
              "correct_option": index_of_correct_option_0_to_3,
              "marks": positive_integer
            }

            For Coding Problems:
            {
              "question_text": "Detailed problem description with constraints and examples. <pre><code>function test() { return true; }</code></pre>",
              "type": "coding",
              "title": "Short descriptive title for the problem",
              "difficulty": "Easy/Medium/Hard",
              "marks": positive_integer,
              "test_cases": [
                { "input": "...", "output": "..." },
                { "input": "...", "output": "..." }
              ]
            }

            Return ONLY a raw JSON array of objects. Do not include markdown code blocks, backticks, or any preamble around the output array itself.
            
            Document Content:
            ${documentText.substring(0, 30000)}
        `;
        const response = yield aiProvider.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        let generatedJson = response.text || '[]';
        // Clean up any rogue markdown formatting if Gemini still included it
        generatedJson = generatedJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const questions = JSON.parse(generatedJson);
        res.status(200).json({ questions });
    }
    catch (error) {
        console.error('Document Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate questions. ' + error.message });
    }
});
exports.generateFromDoc = generateFromDoc;
// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private/Faculty or Admin
const updateExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, start_time, end_time, tab_switch_limit, answer_reveal_mode, auto_submit, questions, target_year, target_years, departments, duration, has_mcq, has_coding, mcq_duration, coding_duration, } = req.body;
        const exam = yield Exam_1.default.findById(req.params.id);
        if (exam) {
            exam.title = title || exam.title;
            exam.description = description !== undefined ? description : exam.description;
            exam.start_time = start_time || exam.start_time;
            exam.end_time = end_time || exam.end_time;
            exam.tab_switch_limit = tab_switch_limit !== undefined ? tab_switch_limit : exam.tab_switch_limit;
            exam.answer_reveal_mode = answer_reveal_mode || exam.answer_reveal_mode;
            exam.auto_submit = auto_submit !== undefined ? auto_submit : exam.auto_submit;
            exam.questions = questions || exam.questions;
            if (target_years) {
                exam.target_years = target_years;
            }
            else if (target_year) {
                exam.target_years = [target_year];
            }
            exam.departments = departments !== undefined ? departments : exam.departments;
            exam.duration = duration || exam.duration;
            exam.has_mcq = has_mcq !== undefined ? has_mcq : exam.has_mcq;
            exam.has_coding = has_coding !== undefined ? has_coding : exam.has_coding;
            exam.mcq_duration = mcq_duration !== undefined ? mcq_duration : exam.mcq_duration;
            exam.coding_duration = coding_duration !== undefined ? coding_duration : exam.coding_duration;
            const updatedExam = yield exam.save();
            res.json(updatedExam);
        }
        else {
            res.status(404).json({ message: 'Exam not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.updateExam = updateExam;
// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private/Admin
const deleteExam = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const exam = yield Exam_1.default.findById(req.params.id);
        if (exam) {
            yield exam.deleteOne();
            res.json({ message: 'Exam and related records removed' });
        }
        else {
            res.status(404).json({ message: 'Exam not found' });
        }
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.deleteExam = deleteExam;
