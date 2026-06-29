package org.example.logmetricapi.config;

import org.example.logmetricapi.interceptor.ApiKeyInterceptor;
import org.example.logmetricapi.repository.ClientApplicationRepository;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

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

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("https://logmetric-ui.vercel.app", "http://localhost:3000")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
