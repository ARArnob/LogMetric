package org.example.logmetricapi.interceptor;

import java.util.Optional;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.example.logmetricapi.model.ClientApplication;
import org.example.logmetricapi.repository.ClientApplicationRepository;
import org.springframework.web.servlet.HandlerInterceptor;

public class ApiKeyInterceptor implements HandlerInterceptor {
    private final ClientApplicationRepository repository;
    public ApiKeyInterceptor(ClientApplicationRepository repository) {
        this.repository = repository;
    }
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String header = request.getHeader("X-Api-Key");
        if (header == null || header.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        Optional<ClientApplication> api_key = repository.findByApiKey(header);
        if (!api_key.isPresent()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return false;
        }
        return true;
    }
}