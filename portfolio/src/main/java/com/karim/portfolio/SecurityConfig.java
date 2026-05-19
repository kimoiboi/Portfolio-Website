package com.karim.portfolio;

import com.karim.portfolio.security.TwoFactorController;

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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        SecurityContextRepository securityContextRepository
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
                    "/blog.html",
                    "/resume.html",
                    "/projects-entry",
                    "/projects",
                    "/login",
                    "/2fa",
                    "/2fa/cancel",
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
                .permitAll()
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/projects")
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
        @Value("${portfolio.admin.username:kimoiboi}") String username,
        @Value("${portfolio.admin.password-bcrypt:}") String bcryptHash
    ) {
        if (bcryptHash == null || bcryptHash.isBlank()) {
            throw new IllegalStateException(
                "Set portfolio.admin.password-bcrypt / PORTFOLIO_ADMIN_PASSWORD_BCRYPT to a bcrypt hash"
            );
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