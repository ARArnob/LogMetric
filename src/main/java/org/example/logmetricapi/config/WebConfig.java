package org.example.logmetricapi.config;

import org.example.logmetricapi.interceptor.ApiKeyInterceptor;
import org.example.logmetricapi.repository.ClientApplicationRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final ClientApplicationRepository repository;
    public WebConfig(ClientApplicationRepository repository) {
        this.repository = repository;
    }
    @Override
    public void addInterceptors(InterceptorRegistry registry){
        registry.addInterceptor(new ApiKeyInterceptor(repository)).addPathPatterns("/api/**");
    }
}
