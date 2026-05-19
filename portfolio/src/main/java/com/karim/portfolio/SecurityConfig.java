package com.karim.portfolio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth

                // Static files
                .requestMatchers(
                    "/style.css",
                    "/scripts/**",
                    "/images/**",
                    "/fonts/**",
                    "/favicon.ico"
                ).permitAll()

                // Public pages
                .requestMatchers(
                    "/",
                    "/index.html",
                    "/blog.html",
                    "/resume.html",
                    "/projects-entry",
                    "/projects",
                    "/login",
                    "/error"
                ).permitAll()

                // Guests are allowed to VIEW project/github data
                .requestMatchers(HttpMethod.GET, "/api/github/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/selected-repos").permitAll()

                // Only admin can change selected project cards
                .requestMatchers(HttpMethod.POST, "/api/selected-repos").hasRole("ADMIN")

                // Only admin can add/edit/delete project/github data
                .requestMatchers(HttpMethod.POST, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/github/**").hasRole("ADMIN")

                // Anything else requires login
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .defaultSuccessUrl("/projects", true)
                .permitAll()
            )
            .logout(logout -> logout
                // After logging out, stay on projects page as a guest
                .logoutSuccessUrl("/projects")
                .permitAll()
            );

        return http.build();
    }

    @Bean
    UserDetailsService userDetailsService(
        @Value("${portfolio.admin.username:kimoiboi}") String username,
        @Value("${portfolio.admin.password-bcrypt:}") String bcryptHash
    ) {
        if (bcryptHash == null || bcryptHash.isBlank()) {
            throw new IllegalStateException("Set portfolio.admin.password-bcrypt / PORTFOLIO_ADMIN_PASSWORD_BCRYPT to a bcrypt hash");
        }

        if (!bcryptHash.startsWith("{bcrypt}")) {
            bcryptHash = "{bcrypt}" + bcryptHash;
        }

        UserDetails admin = User.withUsername(username)
            .password(bcryptHash)
            .roles("ADMIN")
            .build();

        return new InMemoryUserDetailsManager(admin);
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}