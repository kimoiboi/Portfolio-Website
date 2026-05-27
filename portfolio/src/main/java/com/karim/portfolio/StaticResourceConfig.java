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

        registry.addResourceHandler("/images/**")
            .addResourceLocations(
                "file:uploads/images/",
                "classpath:/static/images/"
            )
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/fonts/**")
            .addResourceLocations("classpath:/static/fonts/")
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/scripts/**")
            .addResourceLocations("classpath:/static/scripts/")
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/style.css")
            .addResourceLocations("classpath:/static/")
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());

        registry.addResourceHandler("/favicon.ico")
            .addResourceLocations(
                "classpath:/static/",
                "classpath:/static/images/"
            )
            .setCacheControl(CacheControl.maxAge(7, TimeUnit.DAYS).cachePublic());
    }
}