export const AUDIT_ACTIONS = {

    ROUTE_ACCESSED: 'route_accessed',
    USER_AUTH_REDIRECT: 'user_auth_redirect',
    USER_AUTH_REQUIRED: 'user_auth_required',

    USER_NAME_CHANGED: 'user_name_changed',
    USER_PASSWORD_CHANGED: 'user_password_changed',
    USER_EMAIL_VERIFIED: 'user_email_verified',
    USER_LOGIN_SUCCESS: 'user_login_success',
    USER_LOGIN_FAILED: 'user_login_failed',
    USER_LOGOUT: 'user_logout',

    INVOICE_GENERATED: 'invoice_generated',
    INVOICE_SENT_EMAIL: 'invoice_sent_email',
    INVOICE_PAID: 'invoice_paid',

    APIKEY_CREATED: 'apikey_created',
    APIKEY_DELETED: 'apikey_deleted',
    APIKEY_ACTIVATED: 'apikey_activated',
    APIKEY_DEACTIVATED: 'apikey_deactivated',
    APIKEY_DAILY_LIMIT_HIT: 'apikey_daily_limit_hit',
    APIKEY_MONTHLY_LIMIT_HIT: 'apikey_monthly_limit_hit',
    APIKEY_TOTAL_LIMIT_HIT: 'apikey_total_limit_hit',
    APIKEY_EXPIRED: 'apikey_expired',
    APIKEY_EXPIRATION_MODIFIED: 'apikey_expiration_modified',
    APIKEY_ASSIGNED_PROJECT: 'apikey_assigned_project',
    APIKEY_DEASSIGNED_PROJECT: 'apikey_deassigned_project',
    APIKEY_NAME_CHANGED: 'apikey_name_changed',
    APIKEY_LIMITS_MODIFIED: 'apikey_limits_modified',
    APIKEY_IP_WHITELISTED: 'apikey_ip_whitelisted',
    APIKEY_DOMAIN_WHITELISTED: 'apikey_domain_whitelisted',
    APIKEY_WHITELIST_REMOVED: 'apikey_whitelist_removed',
    APIKEY_MODELS_MODIFIED: 'apikey_models_modified',
    APIKEY_PERMISSIONS_ENABLED: 'apikey_permissions_enabled',
    APIKEY_PERMISSIONS_DISABLED: 'apikey_permissions_disabled',

    PROJECT_CREATED: 'project_created',
    PROJECT_DELETED: 'project_deleted',
    PROJECT_LIMITS_CHANGED: 'project_limits_changed',
    PROJECT_FIELDS_MODIFIED: 'project_fields_modified',
    PROJECT_MEMBER_INVITED: 'project_member_invited',
    PROJECT_MEMBER_ADDED: 'project_member_added',
    PROJECT_MEMBER_REMOVED: 'project_member_removed',
    PROJECT_MEMBER_ROLE_CHANGED: 'project_member_role_changed',
    PROJECT_INVITATION_SENT: 'project_invitation_sent',
    PROJECT_INVITATION_CANCELLED: 'project_invitation_cancelled',

    COMPLETION_SUCCESS: 'completion_success',
    COMPLETION_FAILED: 'completion_failed',
    COMPLETION_RATE_LIMITED: 'completion_rate_limited',
    COMPLETION_QUOTA_EXCEEDED: 'completion_quota_exceeded',
    COMPLETION_MODEL_FALLBACK: 'completion_model_fallback',

    API_REQUEST_UNAUTHORIZED: 'api_request_unauthorized',
    API_REQUEST_INVALID_KEY: 'api_request_invalid_key',
    API_REQUEST_BLOCKED_IP: 'api_request_blocked_ip',
    API_REQUEST_BLOCKED_DOMAIN: 'api_request_blocked_domain',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

export const AUDIT_RESOURCES = {
    USER: 'user',
    INVOICE: 'invoice',
    APIKEY: 'apikey',
    PROJECT: 'project',
    PROJECT_MEMBER: 'project_member',
    PROJECT_INVITATION: 'project_invitation',
    COMPLETION: 'completion',
    API_REQUEST: 'api_request',
} as const;

export type AuditResource = typeof AUDIT_RESOURCES[keyof typeof AUDIT_RESOURCES];

export interface AuditLogDetails {
    requestId?: string;
    path?: string;
    method?: string;
    userAgent?: string;
    duration?: number;
    isProtected?: boolean;
    isPublicApi?: boolean;
    timestamp?: string;
    success?: boolean;
    apiKeyId?: string;
    model?: string;
    provider?: string;
    error?: string;
    reason?: string;
    [key: string]: any;
}