import {NextRequest, NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {z} from 'zod';
import {nanoid} from 'nanoid';
import {hashApiKey} from '@/lib/auth';
import {ALL_MODELS_CONFIG, ModelConfig} from '@/lib/modelsConfig';
import {simulateApiCall} from '@/lib/mockLLM';
import {ApiKey, Project, User} from '@prisma/client';
import {getKeyUsageStatus} from '@/lib/keyUsage';
import {auditHelpers} from '@/lib/audit';

const apiRequestSchema = z.object({
    model: z.string().min(1, {message: 'Model ID is required.'}),
    messages: z.array(
        z.object({
            role: z.enum(['user', 'assistant', 'system']),
            content: z.string(),
        })
    ).min(1, {message: 'At least one message is required.'}),
});

type EnrichedApiKey = ApiKey & {
    user: User | null;
    project: Project | null;
};

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${nanoid(8)}`;
    let keyData: EnrichedApiKey | null = null;
    let billingUserId: string | null = null;
    let modelConfig: ModelConfig | undefined = undefined;
    let validatedData: any = null;

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            await auditHelpers.logApiRequestBlocked(
                null,
                'unauthorized',
                {
                    endpoint: '/v1/chat/completions',
                    requestId,
                },
                request
            );

            return NextResponse.json({
                error: {
                    message: 'Unauthorized: Missing or invalid API key.',
                    type: 'authentication_error'
                }
            }, {status: 401});
        }

        const apiKey = authHeader.split(' ')[1];
        const hashedKey = hashApiKey(apiKey);

        keyData = await prisma.apiKey.findUnique({
            where: {hashedKey},
            include: {
                user: true,
                project: true,
            },
        });

        if (!keyData || !keyData.active || keyData.revokedAt) {
            let errorMessage = 'Forbidden: Invalid, inactive, or expired API Key.';

            if (keyData?.revokedAt) {
                errorMessage = 'Forbidden: This API Key has been permanently revoked.';
            } else if (!keyData?.active) {
                errorMessage = 'Forbidden: This API Key is currently inactive.';
            }

            await auditHelpers.logApiRequestBlocked(
                keyData?.userId || null,
                'invalid_key',
                {
                    apiKeyId: keyData?.id,
                    endpoint: '/v1/chat/completions',
                    requestId,
                },
                request
            );

            return NextResponse.json({
                error: {message: errorMessage, type: 'authentication_error'}
            }, {status: 403});
        }

        const usageStatus = await getKeyUsageStatus(keyData.id);

        if (!usageStatus) {
            return NextResponse.json({
                error: {message: 'API Key configuration error', type: 'api_error'}
            }, {status: 500});
        }

        if (usageStatus.status !== 'ok') {
            let errorMessage = 'API Key Error';
            let statusCode = 403;
            let failureReason: 'rate_limit' | 'quota_exceeded' | 'invalid_request' | 'server_error' = 'rate_limit';

            switch (usageStatus.status) {
                case 'limit_exceeded':
                    errorMessage = 'API Key usage limit exceeded';
                    statusCode = 429;
                    failureReason = 'quota_exceeded';
                    break;
                case 'inactive':
                    errorMessage = 'API Key is inactive';
                    failureReason = 'rate_limit';
                    break;
                case 'expired':
                    errorMessage = 'API Key has expired';
                    failureReason = 'rate_limit';
                    break;
            }

            billingUserId = keyData.project ? keyData.project.ownerId : keyData.userId;
            if (billingUserId) {
                await auditHelpers.logCompletionFailure(
                    billingUserId,
                    keyData.id,
                    {
                        model: 'unknown',
                        provider: 'unknown',
                        error: errorMessage,
                        requestId,
                        reason: failureReason,
                    },
                    request
                );
            }

            return NextResponse.json({
                error: {message: errorMessage, type: 'authentication_error'}
            }, {status: statusCode});
        }

        const body = await request.json();
        const validation = apiRequestSchema.safeParse(body);

        if (!validation.success) {
            billingUserId = keyData.project ? keyData.project.ownerId : keyData.userId;
            if (billingUserId) {
                await auditHelpers.logCompletionFailure(
                    billingUserId,
                    keyData.id,
                    {
                        model: body?.model || 'unknown',
                        provider: 'unknown',
                        error: 'Invalid request format',
                        requestId,
                        reason: 'invalid_request',
                    },
                    request
                );
            }

            return NextResponse.json({
                error: {
                    message: 'Bad Request',
                    details: validation.error.flatten(),
                    type: 'invalid_request_error'
                }
            }, {status: 400});
        }

        validatedData = validation.data;
        const {model: modelId, messages} = validatedData;

        billingUserId = keyData.project ? keyData.project.ownerId : keyData.userId;
        if (!billingUserId) {
            console.error(`CRITICAL: API Key ${keyData.id} has no billable user.`);
            return NextResponse.json({
                error: {
                    message: 'Internal Server Error: Key is not associated with a billable entity.',
                    type: 'api_error'
                }
            }, {status: 500});
        }

        modelConfig = ALL_MODELS_CONFIG.find(model => model.modelIdentifier === modelId);
        if (!modelConfig) {
            await auditHelpers.logCompletionFailure(
                billingUserId,
                keyData.id,
                {
                    model: modelId,
                    provider: 'unknown',
                    error: `Model not found: ${modelId}`,
                    requestId,
                    reason: 'invalid_request',
                },
                request
            );

            return NextResponse.json({
                error: {
                    message: `Model not found: ${modelId}`,
                    type: 'invalid_request_error'
                }
            }, {status: 404});
        }

        const errorChance = Math.random();
        if (errorChance < 0.01) {
            const providerErrors: Record<string, { status: number; message: string; type: string }> = {
                'openai': {
                    status: 500,
                    message: 'The server had an error while processing your request. Sorry about that!',
                    type: 'server_error'
                },
                'anthropic': {
                    status: 529,
                    message: 'Anthropic API is temporarily overloaded. Please try again.',
                    type: 'overloaded_error'
                },
                'google': {
                    status: 503,
                    message: 'The service is currently unavailable.',
                    type: 'unavailable_error'
                }
            };

            if (providerErrors[modelConfig.providerId]) {
                const providerError = providerErrors[modelConfig.providerId];

                await prisma.usage.create({
                    data: {
                        apiKeyId: keyData.id,
                        projectId: keyData.projectId,
                        userId: billingUserId,
                        provider: modelConfig.providerId,
                        model: modelId,
                        tokensInput: 0,
                        tokensOutput: 0,
                        cost: 0,
                        markup: 0,
                        totalCost: 0,
                        requestId: `mock-error-${nanoid()}`,
                        success: false,
                        latency: Math.floor(Math.random() * 100) + 10,
                        endpoint: '/v1/chat/completions',
                        cached: false,
                        cacheHit: false,
                        timestamp: new Date(),
                        metadata: {
                            error: providerError.type,
                            errorMessage: providerError.message,
                            keyType: keyData.projectId ? 'project' : 'user',
                        },
                    },
                });

                await auditHelpers.logCompletionFailure(
                    billingUserId,
                    keyData.id,
                    {
                        model: modelId,
                        provider: modelConfig.providerId,
                        error: providerError.message,
                        requestId,
                        reason: 'server_error',
                    },
                    request
                );

                return NextResponse.json({
                    error: {
                        message: providerError.message,
                        type: providerError.type,
                        code: `${modelConfig.providerId}_error`
                    }
                }, {status: providerError.status});
            }
        }

        const lastMessageContent = messages[messages.length - 1].content;
        const simulationResult = simulateApiCall(lastMessageContent, modelConfig);

        const markup = parseFloat(process.env.DEFAULT_MARKUP_PERCENT || '20');
        const markupAmount = simulationResult.totalCost * (markup / 100);
        const finalCostToUser = simulationResult.totalCost + markupAmount;
        const isCacheHit = Math.random() < 0.01;

        await prisma.usage.create({
            data: {
                apiKeyId: keyData.id,
                projectId: keyData.projectId,
                userId: billingUserId,
                provider: modelConfig.providerId,
                model: modelId,
                tokensInput: simulationResult.tokensInput,
                tokensOutput: simulationResult.tokensOutput,
                cost: simulationResult.totalCost,
                markup: markupAmount,
                totalCost: finalCostToUser,
                requestId: `mock-${nanoid()}`,
                success: true,
                latency: Math.floor(Math.random() * 400) + 50,
                endpoint: '/v1/chat/completions',
                cached: false,
                cacheHit: isCacheHit,
                timestamp: new Date(),
                metadata: {
                    markupPercentApplied: markup,
                    prompt_start: lastMessageContent.substring(0, 50) + (lastMessageContent.length > 50 ? '...' : ''),
                    keyType: keyData.projectId ? 'project' : 'user',
                },
            },
        });

        await auditHelpers.logCompletionSuccess(
            billingUserId,
            keyData.id,
            {
                model: modelId,
                provider: modelConfig.providerId,
                tokensInput: simulationResult.tokensInput,
                tokensOutput: simulationResult.tokensOutput,
                cost: finalCostToUser,
                latency: Date.now() - startTime,
                requestId,
            },
            request
        );

        return NextResponse.json({
            id: `chatcmpl-mock-${nanoid()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: modelId,
            choices: [{
                index: 0,
                message: {
                    role: 'assistant',
                    content: simulationResult.response,
                },
                finish_reason: 'stop',
            }],
            usage: {
                prompt_tokens: simulationResult.tokensInput,
                completion_tokens: simulationResult.tokensOutput,
                total_tokens: simulationResult.totalTokens,
            },
        });

    } catch (error) {
        console.error('[API v1/chat/completions] Unhandled Error:', error);

        if (billingUserId && keyData) {
            await auditHelpers.logCompletionFailure(
                billingUserId,
                keyData.id,
                {
                    model: validatedData?.model || modelConfig?.modelIdentifier || 'unknown',
                    provider: modelConfig?.providerId || 'unknown',
                    error: error instanceof Error ? error.message : 'Unknown server error',
                    requestId,
                    reason: 'server_error',
                },
                request
            );
        }

        if (error instanceof SyntaxError) {
            return NextResponse.json({
                error: {
                    message: 'Bad Request: Invalid JSON format.',
                    type: 'invalid_request_error'
                }
            }, {status: 400});
        }

        return NextResponse.json({
            error: {message: 'Internal Server Error', type: 'api_error'}
        }, {status: 500});
    }
}