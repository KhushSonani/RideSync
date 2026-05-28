import nodemailer from "nodemailer";

export const sendEmail = async ({ email, subject, message }) => {
    const hasSmtpConfig = 
        process.env.SMTP_HOST && 
        process.env.SMTP_PORT && 
        process.env.SMTP_USER && 
        process.env.SMTP_PASS;

    if (!hasSmtpConfig) {
        return true;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const mailOptions = {
            from: `"${process.env.SMTP_FROM_NAME || "RideSync"}" <${process.env.SMTP_FROM_EMAIL || "noreply@ridesync.com"}>`,
            to: email,
            subject: subject,
            text: message,
            html: message.replace(/\n/g, "<br>"),
        };

        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error("Error occurred while sending email:", error);
        return false;
    }
};
