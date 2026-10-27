import { Resend } from "resend";

export const sendPasswordResetEmail = async (email, resetUrl) => {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error(
            "Email service is not configured: RESEND_API_KEY is missing.",
        );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
        from: "DevDesk <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your DevDesk password",

        text: `You requested a password reset for DevDesk.

Open this link to reset your password:
${resetUrl}

This link expires in 15 minutes.`,

        html: `
            <h2>Reset your DevDesk password</h2>
            <p>You requested a password reset for your account.</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
        `,
    });

    if (error) {
        throw new Error(
            `Failed to send password reset email: ${error.message}`,
        );
    }

    return data;
};