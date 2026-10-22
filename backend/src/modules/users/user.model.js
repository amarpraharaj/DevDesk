
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required."],
            trim: true,
            maxlength: [80, "Name cannot exceed 80 characters."],
        },

        email: {
            type: String,
            required: [true, "Email is required."],
            lowercase: true,
            trim: true,
            unique: true,
            index: true,
        },

        passwordHash: {
            type: String,
            required: [true, "Password hash is required."],
            select: false,
        },

        resetPasswordTokenHash: {
            type: String,
            select: false,
        },

        resetPasswordExpiresAt: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);

export default User;
