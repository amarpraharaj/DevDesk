
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendPasswordResetEmail = async (email, resetUrl) => {
    const { data, error } = await resend.emails.send({
        from: "DevDesk <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your DevDesk password",
        text: `You requested a password reset for DevDesk.\n\nOpen this link to reset your password:\n${resetUrl}\n\nThis link expires in 15 minutes.`,
        html: `
            <h2>Reset your DevDesk password</h2>
            <p>You requested a password reset for your account.</p>
            <p><a href="${resetUrl}">Reset Password</a></p>
            <p>This link expires in 15 minutes.</p>
            <p>If you did not request this, you can ignore this email.</p>
        `,
    });

    if (error) {
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    return data;
};
