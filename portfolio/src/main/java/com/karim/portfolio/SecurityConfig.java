package com.karim.portfolio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
            // allow access to static assets
            .requestMatchers(
                "/style.css",
                "/scripts/**",
                "/images/**",
                "/fonts/**",
                "/favicon.ico"
            ).permitAll()

            // allow access to public pages + login page
            .requestMatchers(
                "/", "/index.html", "/blog.html", "/resume.html",
                "/projects-entry", "/projects",
                "/login", "/error"
            ).permitAll()

            // protect your “admin-only” API
            .requestMatchers("/api/github/**").hasRole("ADMIN")

            .anyRequest().authenticated()
        )
        .formLogin(form -> form
            .loginPage("/login")            // GET /login shows the page
            .loginProcessingUrl("/login")   // POST /login processes login
            .defaultSuccessUrl("/projects", true)
            .permitAll()
        )
        .logout(logout -> logout
            .logoutSuccessUrl("/index.html")
            .permitAll()
        );

        return http.build();
    }

    // Only I can login with the information below
    @Bean
    UserDetailsService userDetailsService(
        @Value("${portfolio.admin.username:kimoiboi}") String username,
        @Value("${portfolio.admin.password-bcrypt:}") String bcryptHash
    ) {
        if (bcryptHash == null || bcryptHash.isBlank()) {
            throw new IllegalStateException("Set portfolio.admin.password-bcrypt / PORTFOLIO_ADMIN_PASSWORD_BCRYPT to a bcrypt hash");
        }

        // Ensure DelegatingPasswordEncoder can route to bcrypt even if the prefix is missing
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
