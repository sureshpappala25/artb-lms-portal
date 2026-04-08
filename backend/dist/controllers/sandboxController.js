"use strict";
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
exports.executeCode = void 0;
// Helper to encode to base64
const toBase64 = (str) => Buffer.from(str || '').toString('base64');
// Helper to decode from base64
const fromBase64 = (str) => Buffer.from(str || '', 'base64').toString('utf-8');
// @desc    Execute code in sandbox
// @route   POST /api/sandbox/execute
// @access  Private
const executeCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { language, code, test_cases } = req.body;
        if (!code || !language) {
            return res.status(400).json({ message: 'Code and language are required' });
        }
        // Mapping to Judge0 Language IDs
        const langMapping = {
            'c': 103, // C (GCC 14.1.0)
            'cpp': 105, // C++ (GCC 14.1.0)
            'cpp17': 105,
            'python': 100, // Python (3.12.5)
            'python3': 100,
            'java': 91, // Java (JDK 17.0.6)
            'javascript': 102, // JavaScript (Node.js 22.08.0)
            'nodejs': 102
        };
        const langKey = language.toLowerCase();
        const languageId = langMapping[langKey];
        if (!languageId) {
            return res.status(400).json({ message: `Unsupported language: ${language}` });
        }
        // Special handling for Python: Reject semicolons (ignoring strings and comments)
        if (langKey === 'python' || langKey === 'python3') {
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Remove strings and comments to check for raw semicolons
                // Note: Simplified check for exam environment
                const sanitizedLine = line
                    .replace(/(?:"{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3})/g, '""') // Triple quotes
                    .replace(/(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g, '""') // Single/Double quotes
                    .replace(/#.*$/, ''); // Comments
                if (sanitizedLine.includes(';')) {
                    const col = line.indexOf(';');
                    const errorBox = `${line}\n${' '.repeat(col)}^`;
                    return res.status(400).json({
                        message: 'Compilation failed',
                        compilation_error: `  File "solution.py", line ${i + 1}\n    ${errorBox}\nSyntaxError: Semicolons are not allowed in Python code.`
                    });
                }
            }
        }
        // Special handling for Java: Judge0 expects the class to be 'Main' in 'Main.java'
        let processedCode = code;
        if (langKey === 'java') {
            // Replace 'public class [Something]' with 'public class Main'
            processedCode = code.replace(/public\s+class\s+\w+/, 'public class Main');
        }
        // Check if student code reads input when test cases provide it
        const hasInputInTestCases = test_cases && test_cases.some((tc) => tc.input && tc.input.trim() !== '');
        if (hasInputInTestCases) {
            const inputKeywords = {
                'python': ['input(', 'sys.stdin'],
                'python3': ['input(', 'sys.stdin'],
                'java': ['Scanner', 'BufferedReader', 'System.in', 'DataInputStream'],
                'c': ['scanf', 'gets', 'fgets', 'getchar', 'fscanf'],
                'cpp': ['cin', 'scanf', 'gets', 'fgets', 'getchar'],
                'cpp17': ['cin', 'scanf', 'gets', 'fgets', 'getchar'],
                'javascript': ['readline', 'fs.readFileSync(0)', 'process.stdin'],
                'nodejs': ['readline', 'fs.readFileSync(0)', 'process.stdin']
            };
            const keywords = inputKeywords[langKey] || [];
            const codeWithoutComments = processedCode
                .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove C-style comments
                .replace(/#.*/g, ''); // Remove Python-style comments
            const readsInput = keywords.some(k => codeWithoutComments.includes(k));
            if (!readsInput && keywords.length > 0) {
                return res.status(400).json({
                    message: 'Code evaluation failed.\nYour code does not appear to read the provided test case input. Please use appropriate input functions.',
                    compilation_error: `Your code does not appear to read the provided test case input. Please use appropriate input functions (e.g., ${keywords[0]} for ${language}).`
                });
            }
        }
        // If no test cases, just return success if code is present
        if (!test_cases || test_cases.length === 0) {
            return res.json({
                message: 'No test cases provided.',
                results: [],
                all_passed: true,
                compilation_error: null,
                runtime_output: 'No code execution performed (No test cases)'
            });
        }
        const results = [];
        let compilationError = null;
        let mainRuntimeOutput = null;
        // Execute each test case via Judge0 CE API
        for (const tc of test_cases) {
            // Judge0 setup: wait=true makes it synchronous, base64_encoded=true for safe characters
            const response = yield fetch('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_code: toBase64(processedCode),
                    language_id: languageId,
                    stdin: toBase64(tc.input || '')
                })
            });
            if (!response.ok) {
                const errText = yield response.text();
                throw new Error(`Judge0 API error: ${errText || response.statusText}`);
            }
            const data = yield response.json();
            // Decode outputs from base64
            const stdout = fromBase64(data.stdout);
            const stderr = fromBase64(data.stderr);
            const compile_output = fromBase64(data.compile_output);
            const message = fromBase64(data.message);
            // Judge0 Fields: stdout, stderr, compile_output, message, status
            // Status 6 = Compilation Error. 
            // Only report compilation error if status is specifically 6 to avoid false positives in Python.
            if (((_a = data.status) === null || _a === void 0 ? void 0 : _a.id) === 6) {
                compilationError = compile_output || stderr || message || 'Compilation Error';
                break;
            }
            const actualOutput = (stdout || '').trim();
            const expectedOutput = (tc.expected_output || tc.expected || '').trim();
            const passed = actualOutput === expectedOutput;
            if (!mainRuntimeOutput)
                mainRuntimeOutput = stdout || stderr || '';
            results.push({
                input: tc.input,
                expected: expectedOutput,
                actual: actualOutput,
                passed,
                error: stderr || null
            });
        }
        const all_passed = results.length > 0 && results.every(r => r.passed);
        res.json({
            message: compilationError ? 'Compilation failed. \nPlease check your code and try again. \nProgram must read inputs from the console. ' :
                (all_passed ? 'All test cases passed!' : 'Some test cases failed.'),
            results: compilationError ? [] : results,
            all_passed: compilationError ? false : all_passed,
            compilation_error: compilationError,
            runtime_output: mainRuntimeOutput
        });
    }
    catch (error) {
        console.error('Execution Error:', error);
        res.status(500).json({ message: error.message || 'Error connecting to execution server' });
    }
});
exports.executeCode = executeCode;
