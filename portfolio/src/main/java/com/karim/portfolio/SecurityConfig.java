package com.karim.portfolio;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.filter.OncePerRequestFilter;

import com.karim.portfolio.security.LoginAttemptService;
import com.karim.portfolio.security.SafeRedirects;
import com.karim.portfolio.security.TwoFactorController;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private static final String CONTENT_SECURITY_POLICY = String.join("; ",

        "default-src 'self'",

    
        "script-src 'self' https://kit.fontawesome.com "
            + "https://ka-f.fontawesome.com https://challenges.cloudflare.com "
            + "https://static.cloudflareinsights.com",

        "style-src 'self' 'unsafe-inline' https://ka-f.fontawesome.com",

        "font-src 'self' data: https://ka-f.fontawesome.com",

        "img-src 'self' data: https:",

        "media-src 'self' https:",

        "frame-src https://www.youtube.com https://www.youtube-nocookie.com "
            + "https://player.vimeo.com https://challenges.cloudflare.com",

        "connect-src 'self' https://ka-f.fontawesome.com https://challenges.cloudflare.com "
            + "https://static.cloudflareinsights.com https://cloudflareinsights.com",

        "form-action 'self' https://formspree.io",

        "base-uri 'self'",

        "object-src 'none'",

        "frame-ancestors 'none'"
    );

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

            .headers(headers -> headers

                /*
                 * REPORT-ONLY for now: the browser logs violations to the console
                 * but blocks nothing. Browse every page, fix anything reported,
                 * then delete the .reportOnly() line below to start enforcing.
                 */
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(CONTENT_SECURITY_POLICY)
                    .reportOnly()
                )

                // Send only the origin (not the full path) when linking off-site.
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )

                /*
                 * HSTS is owned by Cloudflare (SSL/TLS > Edge Certificates > HSTS),
                 * which sets it on every edge response. Disabling it here keeps a
                 * single source of truth and avoids a duplicated header.
                 */
                .httpStrictTransportSecurity(hsts -> hsts.disable())
            )

            .authorizeHttpRequests(auth -> auth

                // Static files
                .requestMatchers(
                    "/style.css",
                    "/scripts/**",
                    "/images/**",
                    "/fonts/**",
                    "/favicon.ico",
                    "/.well-known/**"
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
            .addFilterBefore(
                loginLockoutFilter(loginAttemptService),
    UsernamePasswordAuthenticationFilter.class
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

                    request.getSession(true).setAttribute(
                        TwoFactorController.PRE_2FA_REDIRECT,
                        SafeRedirects.sanitize(request.getParameter("redirect"))
                    );

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
                    if (!loginAttemptService.isBlocked(request)) {
                        loginAttemptService.recordFailure(request);
                    }

                    if (loginAttemptService.isBlocked(request)) {
                        response.sendRedirect("/login?locked");
                    } else {
                        response.sendRedirect("/login?error");
                    }
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessHandler((request, response, authentication) -> {
                    String redirectParam = request.getParameter("redirect");

                    String redirect = (redirectParam != null && !redirectParam.isBlank())
                        ? SafeRedirects.sanitize(redirectParam)
                        : SafeRedirects.sanitizeReferer(request.getHeader("Referer"));

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

    private OncePerRequestFilter loginLockoutFilter(LoginAttemptService loginAttemptService) {
        return new OncePerRequestFilter() {
            @Override
            protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain
            ) throws ServletException, IOException {

                boolean isLoginPost = "POST".equalsIgnoreCase(request.getMethod())
                    && "/login".equals(request.getServletPath());

                if (isLoginPost && loginAttemptService.isBlocked(request)) {
                    response.sendRedirect("/login?locked");
                    return;
                }

                filterChain.doFilter(request, response);
            }
        };
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
                .build();
        };
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }
}