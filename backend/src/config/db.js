import mongoose from "mongoose";

const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        throw new Error("MONGODB_URI is not defined");
    }

    await mongoose.connect(mongoURI);

    console.log("MongoDB connected successfully");
};

export default connectDB;