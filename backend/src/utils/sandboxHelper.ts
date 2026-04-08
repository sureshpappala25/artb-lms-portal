// Removed node-fetch import, using global fetch from Node 18+
const toBase64 = (str: string) => Buffer.from(str || '').toString('base64');
const fromBase64 = (str: string) => Buffer.from(str || '', 'base64').toString('utf-8');

export const evaluateCodingQuestion = async (language: string, code: string, test_cases: any[]): Promise<number> => {
    if (!code || !language || !test_cases || test_cases.length === 0) return 0;

    const langMapping: Record<string, number> = {
        'c': 103,
        'cpp': 105,
        'cpp17': 105,
        'python': 100,
        'python3': 100,
        'java': 91,
        'javascript': 102,
        'nodejs': 102
    };

    const langKey = language.toLowerCase();
    const languageId = langMapping[langKey];
    if (!languageId) return 0;

    // Reject semicolons in Python
    if (langKey === 'python' || langKey === 'python3') {
        const lines = code.split('\n');
        for (const line of lines) {
            const sanitizedLine = line
                .replace(/(?:"{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3})/g, '""')
                .replace(/(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g, '""')
                .replace(/#.*$/, '');
            if (sanitizedLine.includes(';')) return 0; // Syntax failure
        }
    }

    let processedCode = code;
    if (langKey === 'java') {
        processedCode = code.replace(/public\s+class\s+\w+/, 'public class Main');
    }

    let passedCount = 0;

    for (const tc of test_cases) {
        try {
            const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=true&wait=true', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_code: toBase64(processedCode),
                    language_id: languageId,
                    stdin: toBase64(tc.input || '')
                })
            });

            if (!response.ok) continue;

            const data = await response.json() as any;
            if (data.status?.id === 6) {
                // Compilation error => 0 passed directly
                return 0;
            }

            const stdout = fromBase64(data.stdout);
            const actualOutput = (stdout || '').trim();
            const expectedOutput = (tc.expected_output || tc.expected || '').trim();

            if (actualOutput === expectedOutput) {
                passedCount++;
            }
        } catch (err) {
            console.error("Error evaluating test case:", err);
        }
    }

    return passedCount;
};
