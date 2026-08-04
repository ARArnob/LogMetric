package org.example.logmetricapi.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Validation failed");
        body.put("fields", fieldErrors);

        return ResponseEntity.badRequest().body(body);
    }

    /**
     * Spring's default error body omits the exception's reason text unless
     * explicitly surfaced -- every ResponseStatusException thrown in this
     * codebase carries a deliberately client-safe message, so include it.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", ex.getReason());

        return ResponseEntity.status(status).body(body);
    }

    /**
     * Without this, AccessDeniedException from every @PreAuthorize check in the app
     * (8 controllers) would fall through to the catch-all below and turn every RBAC
     * rejection into a 500 instead of a 403 -- ExceptionHandlerExceptionResolver runs
     * inside the DispatcherServlet, ahead of Spring Security's filter-level
     * AccessDeniedHandler, so a broad @ExceptionHandler(Exception.class) intercepts it
     * first unless a more specific handler (this one) is declared.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("error", "Forbidden");
        body.put("message", "You do not have permission to perform this action");

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    /**
     * Catch-all so an unanticipated exception (S3, SECURITY-TODO.md) returns a clean,
     * internals-free 500 instead of Spring's default error page/body. The exception is
     * still logged server-side with its full stack trace for debugging -- only the
     * client-facing response is generic. Must stay last-resort: the more specific
     * handlers above (validation, ResponseStatusException) always take precedence.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception reached GlobalExceptionHandler", ex);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("error", "Internal Server Error");
        body.put("message", "Something went wrong. Please try again or contact support.");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
