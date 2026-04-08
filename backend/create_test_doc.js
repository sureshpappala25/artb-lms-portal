const fs = require('fs');
const { Document, Packer, Paragraph, TextRun } = require('docx');

const doc = new Document({
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ text: "Q1. Consider the following Python code snippet. What is the output?", bold: true }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "def greet(name):", font: "Courier New" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "    print('Hello, ' + name)", font: "Courier New" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "greet('World')", font: "Courier New" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("A) Hello, World"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("B) Hello, name"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("C) Error"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("D) None"),
                    ],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Q2. Write a function in JavaScript to sum an array of numbers.", bold: true }),
                    ],
                })
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("test_exam.docx", buffer);
    console.log("Created test_exam.docx");
});
