package com.karim.portfolio;

import java.util.concurrent.TimeUnit;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class StaticResourceConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(
                "/images/**",
                "/fonts/**",
                "/scripts/**",
                "/style.css",
                "/favicon.ico"
            )
            .addResourceLocations(
                "classpath:/static/images/",
                "classpath:/static/fonts/",
                "classpath:/static/scripts/",
                "classpath:/static/",
                "classpath:/static/"
            )
            .setCacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic());
    }
}