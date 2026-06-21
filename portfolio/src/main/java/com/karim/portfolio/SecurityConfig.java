package com.karim.portfolio;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

import com.karim.portfolio.security.LoginAttemptService;
import com.karim.portfolio.security.TwoFactorController;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        SecurityContextRepository securityContextRepository,
        LoginAttemptService loginAttemptService
    ) throws Exception {
        http
            .securityContext(securityContext -> securityContext
                .securityContextRepository(securityContextRepository)
            )
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
                    "/blog",
                    "/blog.html",
                    "/blog/**",
                    "/blogs-entry",
                    "/resume.html",
                    "/projects-entry",
                    "/projects",
                    "/login",
                    "/2fa",
                    "/2fa/cancel",
                    "/error"
                ).permitAll()

                // Guests are allowed to VIEW project,github, & blog data
                .requestMatchers(HttpMethod.GET, "/api/github/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/selected-repos").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/blog/**").permitAll()

                // Only admin can change selected project cards
                .requestMatchers(HttpMethod.POST, "/api/selected-repos").hasRole("ADMIN")

                // Only admin can add/edit/delete project,github, & blog data
                .requestMatchers(HttpMethod.POST, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/github/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/blog/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/blog/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/blog/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/blog/**").hasRole("ADMIN")

                // Anything else requires login
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .successHandler((request, response, authentication) -> {

                    /*
                     * Password was correct.
                     *
                     * But do NOT let Spring keep this as a complete login yet.
                     * Store only the username until the 2FA code is verified.
                     */
                    request.getSession(true).setAttribute(
                        TwoFactorController.PRE_2FA_USERNAME,
                        authentication.getName()
                    );

                    // Preserve the requested redirect so we can return the user after 2FA
                    String requestedRedirect = request.getParameter("redirect");
                    if (requestedRedirect != null && !requestedRedirect.isBlank()) {
                        request.getSession(true).setAttribute(
                            TwoFactorController.PRE_2FA_REDIRECT,
                            requestedRedirect
                        );
                    }

                    /*
                     * Clear the current authentication so ROLE_ADMIN is not active yet.
                     */
                    SecurityContext emptyContext = SecurityContextHolder.createEmptyContext();
                    SecurityContextHolder.setContext(emptyContext);

                    securityContextRepository.saveContext(emptyContext, request, response);

                    request.getSession().removeAttribute(
                        HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY
                    );

                    response.sendRedirect("/login");
                })
                .failureHandler((request, response, exception) -> {
                    String submittedUsername = request.getParameter("username");

                    boolean alreadyLocked = (exception instanceof LockedException)
                        || loginAttemptService.isBlocked(submittedUsername);

                    if (!alreadyLocked) {
                        loginAttemptService.recordFailure(submittedUsername);
                    }

                    if (loginAttemptService.isBlocked(submittedUsername)
                            || exception instanceof LockedException) {
                        response.sendRedirect("/login?locked");
                    } else {
                        response.sendRedirect("/login?error");
                    }
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessHandler((request, response, authentication) -> {
                    String redirect = request.getParameter("redirect");
                    if (redirect == null || redirect.isBlank()) {
                        String referer = request.getHeader("Referer");
                        redirect = (referer != null && !referer.isBlank()) ? referer : "/projects";
                    }

                    request.getSession().invalidate();
                    response.sendRedirect(redirect);
                })
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );

        return http.build();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    UserDetailsService userDetailsService(
        @Value("${portfolio.admin.username:}") String username,
        @Value("${portfolio.admin.password-bcrypt:}") String bcryptHash,
        LoginAttemptService loginAttemptService
    ) {
        if (username == null || username.isBlank()) {
            throw new IllegalStateException(
                "Set portfolio.admin.username / PORTFOLIO_ADMIN_USERNAME"
            );
        }

        if (bcryptHash == null || bcryptHash.isBlank()) {
            throw new IllegalStateException(
                "Set portfolio.admin.password-bcrypt / PORTFOLIO_ADMIN_PASSWORD_BCRYPT to a bcrypt hash"
            );
        }

        final String storedHash = bcryptHash.startsWith("{bcrypt}")
            ? bcryptHash
            : "{bcrypt}" + bcryptHash;

        return submittedUsername -> {
            if (submittedUsername == null || !submittedUsername.equalsIgnoreCase(username)) {
                throw new UsernameNotFoundException("User not found");
            }

            return User.withUsername(username)
                .password(storedHash)
                .roles("ADMIN")
                .accountLocked(loginAttemptService.isBlocked(username))
                .build();
        };
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}