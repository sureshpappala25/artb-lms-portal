import mongoose, { Document, Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';

export interface IUser extends Document {
    name: string;
    email: string;
    registration_number?: string;
    password_hash: string;
    role: 'admin' | 'faculty' | 'student';
    year?: string;
    department?: string;
    mobile_number?: string;
    reset_password_otp?: string;
    reset_password_expires?: Date;
    matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        registration_number: { type: String, unique: true, sparse: true },
        password_hash: { type: String, required: true },
        role: { type: String, enum: ['admin', 'faculty', 'student'], required: true },
        year: { type: String },
        department: { type: String },
        mobile_number: { type: String },
        reset_password_otp: { type: String },
        reset_password_expires: { type: Date },
    },
    { timestamps: true }
);

// Encrypt password before saving
userSchema.pre('save', async function (this: any) {
    if (this.isModified('password_hash')) {
        const salt = await bcrypt.genSalt(10);
        this.password_hash = await bcrypt.hash(this.password_hash, salt);
    }
});

userSchema.methods.matchPassword = async function (this: any, enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

// Cascade delete attempts when a student is deleted
userSchema.pre('deleteOne', { document: true, query: false }, async function (this: any) {
    if (this.role === 'student') {
        await mongoose.model('Attempt').deleteMany({ student_id: this._id });
    }
});

const User = mongoose.model<IUser>('User', userSchema);
export default User;
