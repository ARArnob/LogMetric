package org.example.logmetricapi.model;

/**
 * Application-level roles for access control.
 * Stored as STRING in Postgres (not ORDINAL) so adding/reordering roles
 * later won't corrupt existing data.
 */
public enum Role {
    ADMIN,
    USER
}