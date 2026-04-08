import { Request, Response } from 'express';
import Exam from '../models/Exam';
import Attempt from '../models/Attempt';
import { AuthRequest } from '../middleware/authMiddleware';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParseFn = require('pdf-parse').default || require('pdf-parse');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Public (in real life Student/Faculty/Admin)
export const getExams = async (req: AuthRequest, res: Response) => {
    try {
        const exams = await Exam.find({});
        // Depending on role, we might filter fields (students shouldn't see test cases)
        res.json(exams);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create an exam
// @route   POST /api/exams
// @access  Private/Admin
export const createExam = async (req: AuthRequest, res: Response) => {
    try {
        const {
            title,
            description,
            start_time,
            end_time,
            tab_switch_limit,
            answer_reveal_mode,
            auto_submit,
            questions,
            target_year,
            target_years,
            departments,
            duration,
            has_mcq,
            has_coding,
            mcq_duration,
            coding_duration,
        } = req.body;

        const exam = new Exam({
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
            created_by: req.user?._id,
        });

        const createdExam = await exam.save();
        res.status(201).json(createdExam);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Public (or specific role)
export const getExamById = async (req: AuthRequest, res: Response) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (exam) {
            res.json(exam);
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate Questions from Document
// @route   POST /api/exams/generate-from-doc
// @access  Private/Faculty or Admin
export const generateFromDoc = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No document uploaded' });
        }

        let documentText = '';

        if (req.file.mimetype === 'application/pdf') {
            const dataBuffer = fs.readFileSync(req.file.path);
            const data = await pdfParseFn(dataBuffer);
            documentText = data.text;
        } else if (
            req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            req.file.originalname.endsWith('.docx') ||
            req.file.originalname.endsWith('.doc')
        ) {
            const result = await mammoth.convertToHtml({ path: req.file.path });
            documentText = result.value;
        } else if (
            req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            req.file.mimetype === 'application/vnd.ms-excel' ||
            req.file.originalname.endsWith('.xlsx') ||
            req.file.originalname.endsWith('.xls')
        ) {
            const workbook = xlsx.readFile(req.file.path);
            let combinedText = '';
            workbook.SheetNames.forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                combinedText += xlsx.utils.sheet_to_txt(sheet) + '\n';
            });
            documentText = combinedText;
        } else if (req.file.mimetype === 'text/plain') {
            documentText = fs.readFileSync(req.file.path, 'utf8');
        } else {
            return res.status(400).json({ message: 'Unsupported file format. Please upload PDF, DOCX, XLSX, XLS, or TXT.' });
        }

        // Clean up temporary uploaded file from multer
        fs.unlinkSync(req.file.path);

        const aiProvider = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

        const response = await aiProvider.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let generatedJson = response.text || '[]';
        // Clean up any rogue markdown formatting if Gemini still included it
        generatedJson = generatedJson.replace(/```json/g, '').replace(/```/g, '').trim();

        const questions = JSON.parse(generatedJson);

        res.status(200).json({ questions });
    } catch (error: any) {
        console.error('Document Generation Error:', error);
        res.status(500).json({ message: 'Failed to generate questions. ' + error.message });
    }
};
// @desc    Update an exam
// @route   PUT /api/exams/:id
// @access  Private/Faculty or Admin
export const updateExam = async (req: AuthRequest, res: Response) => {
    try {
        const {
            title,
            description,
            start_time,
            end_time,
            tab_switch_limit,
            answer_reveal_mode,
            auto_submit,
            questions,
            target_year,
            target_years,
            departments,
            duration,
            has_mcq,
            has_coding,
            mcq_duration,
            coding_duration,
        } = req.body;

        const exam = await Exam.findById(req.params.id);

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
            } else if (target_year) {
                exam.target_years = [target_year];
            }
            exam.departments = departments !== undefined ? departments : exam.departments;
            exam.duration = duration || exam.duration;
            exam.has_mcq = has_mcq !== undefined ? has_mcq : exam.has_mcq;
            exam.has_coding = has_coding !== undefined ? has_coding : exam.has_coding;
            exam.mcq_duration = mcq_duration !== undefined ? mcq_duration : exam.mcq_duration;
            exam.coding_duration = coding_duration !== undefined ? coding_duration : exam.coding_duration;

            const updatedExam = await exam.save();
            res.json(updatedExam);
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an exam
// @route   DELETE /api/exams/:id
// @access  Private/Admin
export const deleteExam = async (req: AuthRequest, res: Response) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (exam) {
            await exam.deleteOne();
            res.json({ message: 'Exam and related records removed' });
        } else {
            res.status(404).json({ message: 'Exam not found' });
        }
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
