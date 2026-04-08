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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const User_1 = __importDefault(require("./models/User"));
const Exam_1 = __importDefault(require("./models/Exam"));
const Attempt_1 = __importDefault(require("./models/Attempt"));
const users_1 = require("./data/users");
const exams_1 = require("./data/exams");
dotenv_1.default.config();
(0, db_1.default)();
const importData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Clear existing data
        yield Attempt_1.default.deleteMany();
        yield Exam_1.default.deleteMany();
        yield User_1.default.deleteMany();
        // Insert Users (admin + faculty only)
        const createdUsers = yield User_1.default.insertMany(users_1.users);
        // Find the faculty user to act as creator of exams
        const facultyUser = createdUsers.find(user => user.role === 'faculty');
        if (!facultyUser)
            throw new Error('Failed to find faculty user');
        // Attach creator ref to exams (will be empty array since demo exams removed)
        const sampleExams = exams_1.exams.map(exam => {
            return Object.assign(Object.assign({}, exam), { created_by: facultyUser._id });
        });
        if (sampleExams.length > 0) {
            yield Exam_1.default.insertMany(sampleExams);
        }
        console.log('Data Imported successfully!');
        process.exit();
    }
    catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
});
const destroyData = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield Attempt_1.default.deleteMany();
        yield Exam_1.default.deleteMany();
        yield User_1.default.deleteMany();
        console.log('Data Destroyed!');
        process.exit();
    }
    catch (error) {
        console.error(`Error: ${error}`);
        process.exit(1);
    }
});
if (process.argv[2] === '-d') {
    destroyData();
}
else {
    importData();
}
