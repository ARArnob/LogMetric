package org.example.logmetricapi.model;

// T24 (PLAN.md): every admin-facing mutation and login gets recorded under
// one of these, so the audit page never has to guess what a free-text
// action string meant six months later.
public enum AuditAction {
    LOGIN,
    PASSWORD_CHANGED,
    SYSTEM_CREATED,
    SYSTEM_DELETED,
    KEY_GENERATED,
    KEY_REVOKED,
    ALERT_RULE_CREATED,
    ALERT_RULE_UPDATED,
    ALERT_RULE_DELETED,
    INVITE_CREATED,
    INVITE_REVOKED,
    ROLE_CHANGED,
    ORGANIZATION_RENAMED,
    SERVICE_ALIAS_SET,
    SERVICE_ALIAS_DELETED
}
