import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string) {
    try {
        const fromEmail = process.env.FROM_EMAIL && process.env.FROM_EMAIL !== 'noreply@yourdomain.com'
            ? `UniAI <${process.env.FROM_EMAIL}>`
            : 'UniAI <onboarding@resend.dev>';

        const emailData = {
            from: fromEmail,
            to: [email],
            subject: 'Verify your UniAI account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">Welcome to UniAI</h1>
                    
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                        <h2 style="margin-top: 0; color: #1a202c;">Verify your email address</h2>
                        <p style="color: #4a5568; line-height: 1.6;">Thank you for signing up! Please use the verification code below to complete your registration:</p>
                        
                        <div style="text-align: center; margin: 40px 0;">
                            <div style="background-color: #2563eb; color: white; padding: 20px 40px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; display: inline-block; font-family: monospace;">
                                ${code}
                            </div>
                        </div>
                        
                        <p style="color: #4a5568; margin: 20px 0;">This code will expire in 10 minutes.</p>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                If you didn't request this verification, please ignore this email.
                            </p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 40px;">
                        <p>&copy; 2025 UniAI. All rights reserved.</p>
                    </div>
                </div>
            `,
        };


        const { data, error } = await resend.emails.send(emailData);

        if (error) {
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}

export async function sendWelcomeEmail(email: string, name?: string) {
    try {
        const fromEmail = process.env.FROM_EMAIL && process.env.FROM_EMAIL !== 'noreply@yourdomain.com'
            ? `UniAI <${process.env.FROM_EMAIL}>`
            : 'UniAI <onboarding@resend.dev>';

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: 'Welcome to UniAI - Your account is ready!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb; text-align: center;">Welcome to UniAI${name ? `, ${name}` : ''}!</h1>
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="margin-top: 0;">Your account is now active</h2>
                        <p>Congratulations! Your UniAI account has been verified and is ready to use.</p>
                        
                        <h3>What's next?</h3>
                        <ul>
                            <li>Generate your first API key</li>
                            <li>Explore our supported models (OpenAI, Google, Anthropic)</li>
                            <li>Start building with our unified API</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                Go to Dashboard
                            </a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px;">
                            If you have any questions, feel free to reach out to our support team.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            return { success: false, error };
        }
        return { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}