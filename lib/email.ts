import { Resend } from 'resend';
type InvoiceData = {
    company: {
        name: string
        email: string
        phone?: string
        address: string
        city: string
        country: string
        taxId?: string
    }
    client: { name: string; email: string }
    invoiceNumber: string
    currency: string
    period: { start: string; end: string }
    issueDate: string
    dueDate: string
    summary: {
        subtotal: number
        markupRate: number
        markupAmount: number
        vatRate: number
        vatAmount: number
        total: number
        totalApiCalls: number
        totalTokens: number
    }
    items: { model: string; tokens: number; finalCost: number }[]
}

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

export async function sendInvoiceEmail(invoiceData: InvoiceData, pdfBuffer: Buffer) {
    try {
        const fromEmail = `${invoiceData.company.name} Billing <${process.env.FROM_EMAIL}>`;

        const emailData = {
            from: fromEmail,
            to: [invoiceData.client.email],
            subject: `Invoice ${invoiceData.invoiceNumber} - AI Services`,
            html: generateInvoiceEmailHTML(invoiceData),
            attachments: [
                {
                    filename: `invoice-${invoiceData.invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
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

function generateInvoiceEmailHTML(invoiceData: InvoiceData): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: invoiceData.currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            <div style="background-color: #ffffff; padding: 40px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1a202c; margin: 0; font-size: 28px; font-weight: bold;">
                        ${invoiceData.company.name}
                    </h1>
                    <p style="color: #4a5568; margin: 5px 0; font-size: 16px;">Invoice ${invoiceData.invoiceNumber}</p>
                </div>

                <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
                    <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">Hello ${invoiceData.client.name},</h2>
                    <p style="color: #4a5568; line-height: 1.6; margin: 0;">
                        Thank you for using our AI services! Please find attached your invoice for the billing period 
                        <strong>${new Date(invoiceData.period.start).toLocaleDateString()}</strong> to 
                        <strong>${new Date(invoiceData.period.end).toLocaleDateString()}</strong>.
                    </p>
                </div>

                <div style="display: flex; justify-content: space-between; margin-bottom: 30px; flex-wrap: wrap;">
                    <div style="flex: 1; margin-right: 20px; min-width: 250px;">
                        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Invoice Details</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Invoice Number:</td>
                                <td style="padding: 8px 0; color: #1a202c; font-weight: 500; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                    ${invoiceData.invoiceNumber}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Issue Date:</td>
                                <td style="padding: 8px 0; color: #1a202c; font-weight: 500; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                    ${new Date(invoiceData.issueDate).toLocaleDateString()}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Due Date:</td>
                                <td style="padding: 8px 0; color: #1a202c; font-weight: 500; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                    ${new Date(invoiceData.dueDate).toLocaleDateString()}
                                </td>
                            </tr>
                        </table>
                    </div>
                    
                    <div style="flex: 1; min-width: 250px;">
                        <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">Usage Summary</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Total API Calls:</td>
                                <td style="padding: 8px 0; color: #1a202c; font-weight: 500; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                    ${invoiceData.summary.totalApiCalls.toLocaleString()}
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #4a5568; border-bottom: 1px solid #e2e8f0;">Total Tokens:</td>
                                <td style="padding: 8px 0; color: #1a202c; font-weight: 500; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                    ${invoiceData.summary.totalTokens.toLocaleString()}
                                </td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div style="background-color: #edf2f7; padding: 25px; border-radius: 8px; margin-bottom: 30px;">
                    <h3 style="color: #2d3748; margin: 0 0 20px 0; font-size: 18px; text-align: center;">Cost Breakdown</h3>
                    
                    <table style="width: 100%; border-collapse: collapse; max-width: 400px; margin: 0 auto;">
                        <tr>
                            <td style="padding: 12px 0; color: #4a5568; font-size: 16px;">API Costs (Subtotal):</td>
                            <td style="padding: 12px 0; color: #1a202c; font-weight: 500; text-align: right; font-size: 16px;">
                                ${formatCurrency(invoiceData.summary.subtotal)}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 0; color: #4a5568; font-size: 16px;">
                                Service Fee (${invoiceData.summary.markupRate}%):
                            </td>
                            <td style="padding: 12px 0; color: #1a202c; font-weight: 500; text-align: right; font-size: 16px;">
                                ${formatCurrency(invoiceData.summary.markupAmount)}
                            </td>
                        </tr>
                        ${invoiceData.summary.vatAmount > 0 ? `
                        <tr>
                            <td style="padding: 12px 0; color: #4a5568; font-size: 16px;">
                                VAT (${invoiceData.summary.vatRate}%):
                            </td>
                            <td style="padding: 12px 0; color: #1a202c; font-weight: 500; text-align: right; font-size: 16px;">
                                ${formatCurrency(invoiceData.summary.vatAmount)}
                            </td>
                        </tr>
                        ` : ''}
                        <tr style="border-top: 2px solid #a0aec0;">
                            <td style="padding: 15px 0 0 0; color: #1a202c; font-weight: bold; font-size: 20px;">
                                TOTAL:
                            </td>
                            <td style="padding: 15px 0 0 0; color: #38a169; font-weight: bold; text-align: right; font-size: 24px;">
                                ${formatCurrency(invoiceData.summary.total)}
                            </td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin-bottom: 30px;">
                    <h4 style="color: #c53030; margin: 0 0 10px 0; font-size: 16px;">⏰ Payment Information</h4>
                    <p style="color: #2d3748; margin: 0; line-height: 1.6;">
                        <strong>Payment Terms:</strong> Net 30 days from invoice date<br>
                        <strong>Due Date:</strong> ${new Date(invoiceData.dueDate).toLocaleDateString()}<br>
                        Please ensure payment is made by the due date to avoid any service interruptions.
                    </p>
                </div>

                ${invoiceData.items.length > 0 ? `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #2d3748; margin: 0 0 15px 0; font-size: 16px;">🤖 Top Models Used This Period</h3>
                    <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px;">
                        ${getTopModels(invoiceData.items).slice(0, 3).map(model => `
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #4a5568; font-weight: 500;">${model.name}</span>
                                <span style="color: #1a202c;">${model.tokens.toLocaleString()} tokens</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                       style="background-color: #3182ce; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 500; font-size: 16px;">
                        📊 View in Dashboard
                    </a>
                </div>

                <div style="text-align: center; padding: 20px 0; border-top: 1px solid #e2e8f0;">
                    <h4 style="color: #2d3748; margin: 0 0 10px 0;">❓ Questions about this invoice?</h4>
                    <p style="color: #4a5568; margin: 0 0 15px 0;">
                        Contact our billing team at <a href="mailto:${invoiceData.company.email}" style="color: #3182ce;">${invoiceData.company.email}</a>
                        ${invoiceData.company.phone ? ` or call ${invoiceData.company.phone}` : ''}
                    </p>
                </div>
            </div>

            <div style="text-align: center; color: #718096; font-size: 12px; margin-top: 20px;">
                <p style="margin: 0;">
                    &copy; ${new Date().getFullYear()} ${invoiceData.company.name}. All rights reserved.<br>
                    ${invoiceData.company.address}, ${invoiceData.company.city}, ${invoiceData.company.country}<br>
                    ${invoiceData.company.taxId ? `Tax ID: ${invoiceData.company.taxId}` : ''}
                </p>
                <p style="margin: 10px 0 0 0; font-size: 11px;">
                    This is an automated invoice. Please do not reply to this email.<br>
                    For support, contact us at <a href="mailto:${invoiceData.company.email}" style="color: #3182ce;">${invoiceData.company.email}</a>
                </p>
            </div>
        </div>
    `;
}
type ItemBreakdown = {
    name: string;
    tokens: number;
    cost:   number;
};

function getTopModels(items: InvoiceData['items']): ItemBreakdown[] {
    const modelStats: Record<string, ItemBreakdown> = {};

    for (const { model, tokens, finalCost } of items) {
        if (!modelStats[model]) {
            modelStats[model] = { name: model, tokens: 0, cost: 0 };
        }
        modelStats[model].tokens += tokens;
        modelStats[model].cost   += finalCost;
    }

    return Object.values(modelStats).sort((a, b) => b.tokens - a.tokens);
}

export async function sendHighUsageAlert(email: string, currentCost: number, limit: number, userName?: string) {
    try {
        const fromEmail = `UniAI Alerts <${process.env.FROM_EMAIL}>`;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: '⚠️ High Usage Alert - UniAI',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #fef2f2; border-left: 4px solid #f56565; padding: 20px; border-radius: 8px;">
                        <h1 style="color: #c53030; margin: 0 0 15px 0;">⚠️ High Usage Alert</h1>
                        <p style="color: #2d3748; margin: 0 0 15px 0;">
                            Hello ${userName ? userName : 'there'},
                        </p>
                        <p style="color: #2d3748; margin: 0 0 15px 0;">
                            Your current usage has reached <strong>$${currentCost.toFixed(2)}</strong>, 
                            which is ${((currentCost / limit) * 100).toFixed(1)}% of your spending limit of <strong>$${limit.toFixed(2)}</strong>.
                        </p>
                        <p style="color: #2d3748; margin: 0 0 20px 0;">
                            Consider reviewing your usage or adjusting your spending limits to avoid service interruptions.
                        </p>
                        <div style="text-align: center;">
                            <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                               style="background-color: #c53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                📊 Review Usage
                            </a>
                        </div>
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
export async function sendPaymentConfirmation(email: string, invoiceData: InvoiceData, paymentMethod: string) {
    try {
        const fromEmail = `${invoiceData.company.name} Billing <${process.env.FROM_EMAIL}>`;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `✅ Payment Confirmed - Invoice ${invoiceData.invoiceNumber}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f0fff4; border-left: 4px solid #38a169; padding: 20px; border-radius: 8px;">
                        <h1 style="color: #38a169; margin: 0 0 15px 0;">✅ Payment Confirmed</h1>
                        <p style="color: #2d3748; margin: 0 0 15px 0;">
                            Hello ${invoiceData.client.name},
                        </p>
                        <p style="color: #2d3748; margin: 0 0 15px 0;">
                            We have successfully received your payment of <strong>$${invoiceData.summary.total.toFixed(2)}</strong> 
                            for invoice <strong>${invoiceData.invoiceNumber}</strong>.
                        </p>
                        <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; margin: 15px 0;">
                            <p style="margin: 0; color: #4a5568;"><strong>Payment Method:</strong> ${paymentMethod}</p>
                            <p style="margin: 5px 0 0 0; color: #4a5568;"><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        <p style="color: #2d3748; margin: 15px 0;">
                            Your account is now up to date. Thank you for your business!
                        </p>
                        <div style="text-align: center; margin-top: 20px;">
                            <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                               style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                                📊 View Dashboard
                            </a>
                        </div>
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


export async function sendCostAlertEmail(
    email: string,
    alertName: string,
    currentSpend: number,
    threshold: number,
    type: string,
    userName?: string
) {
    try {
        const fromEmail = `UniAI Alerts <${process.env.FROM_EMAIL}>`;

        let periodText = '';
        switch (type) {
            case 'daily':
                periodText = 'today';
                break;
            case 'weekly':
                periodText = 'this week';
                break;
            case 'monthly':
                periodText = 'this month';
                break;
            default:
                periodText = 'current period';
        }

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: `💰 Cost Alert: ${alertName} - UniAI`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #fef2f2; border-left: 4px solid #f56565; padding: 20px; border-radius: 8px;">
            <h1 style="color: #c53030; margin: 0 0 15px 0;">💰 Cost Alert Triggered</h1>
            <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 18px;">${alertName}</h2>
            <p style="color: #2d3748; margin: 0 0 15px 0;">
              Hello ${userName ? userName : 'there'},
            </p>
            <p style="color: #2d3748; margin: 0 0 20px 0;">
              Your spending ${periodText} has reached <strong>$${currentSpend.toFixed(2)}</strong>, 
              which exceeds your alert threshold of <strong>$${threshold.toFixed(2)}</strong>.
            </p>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Alert Type:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 500; text-align: right;">
                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Threshold:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 500; text-align: right;">
                    $${threshold.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Current Spend:</td>
                  <td style="padding: 8px 0; color: #c53030; font-weight: 500; text-align: right;">
                    $${currentSpend.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Over Threshold:</td>
                  <td style="padding: 8px 0; color: #c53030; font-weight: 500; text-align: right;">
                    $${(currentSpend - threshold).toFixed(2)} (${(((currentSpend - threshold) / threshold) * 100).toFixed(1)}%)
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXTAUTH_URL}/alerts" 
                 style="background-color: #c53030; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                ⚙️ Manage Alerts
              </a>
              <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 View Usage
              </a>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding: 20px; background-color: #f7fafc; border-radius: 8px;">
            <h3 style="color: #2d3748; margin: 0 0 10px 0; font-size: 16px;">💡 Tips to manage your costs:</h3>
            <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
              <li>Review your API usage patterns in the dashboard</li>
              <li>Consider implementing caching for frequently used prompts</li>
              <li>Optimize your model selection based on task requirements</li>
              <li>Set up project-based spending limits</li>
            </ul>
          </div>
          
          <div style="text-align: center; color: #718096; font-size: 12px; margin-top: 30px;">
            <p style="margin: 0;">
              You received this alert because you have cost notifications enabled.<br>
              <a href="${process.env.NEXTAUTH_URL}/alerts" style="color: #3182ce;">Manage your alert preferences</a>
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

export async function sendAnomalyAlertEmail(
    email: string,
    anomalyDetails: {
        type: string;
        currentValue: number;
        expectedValue: number;
        deviation: number;
    },
    userName?: string
) {
    try {
        const fromEmail = `UniAI Alerts <${process.env.FROM_EMAIL}>`;

        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: [email],
            subject: '🔍 Anomaly Detected - UniAI',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px;">
            <h1 style="color: #d97706; margin: 0 0 15px 0;">🔍 Anomaly Detected</h1>
            <p style="color: #2d3748; margin: 0 0 15px 0;">
              Hello ${userName ? userName : 'there'},
            </p>
            <p style="color: #2d3748; margin: 0 0 20px 0;">
              We've detected unusual activity in your API usage that may require your attention.
            </p>
            
            <div style="background-color: white; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Anomaly Type:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 500; text-align: right;">
                    ${anomalyDetails.type}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Current Value:</td>
                  <td style="padding: 8px 0; color: #d97706; font-weight: 500; text-align: right;">
                    ${anomalyDetails.currentValue}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Expected Value:</td>
                  <td style="padding: 8px 0; color: #1a202c; font-weight: 500; text-align: right;">
                    ${anomalyDetails.expectedValue}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #4a5568;">Deviation:</td>
                  <td style="padding: 8px 0; color: #d97706; font-weight: 500; text-align: right;">
                    ${anomalyDetails.deviation}%
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="color: #2d3748; margin: 20px 0;">
              This could indicate:
            </p>
            <ul style="color: #4a5568; margin: 0 0 20px 0; padding-left: 20px;">
              <li>Unexpected spike in API usage</li>
              <li>Potential unauthorized access</li>
              <li>Inefficient code implementation</li>
              <li>Or simply increased legitimate usage</li>
            </ul>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${process.env.NEXTAUTH_URL}/dashboard" 
                 style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🔍 Investigate Usage
              </a>
            </div>
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