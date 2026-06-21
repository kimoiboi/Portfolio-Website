package com.karim.portfolio.security;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.servlet.http.HttpServletRequest;

@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final Duration lockoutDuration;

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
        @Value("${portfolio.login.max-attempts:3}") int maxAttempts,
        @Value("${portfolio.login.lockout-minutes:15}") long lockoutMinutes
    ) {
        this.maxAttempts = maxAttempts <= 0 ? 3 : maxAttempts;
        this.lockoutDuration = Duration.ofMinutes(lockoutMinutes <= 0 ? 15 : lockoutMinutes);
    }

    public boolean isBlocked(HttpServletRequest request) {
        String key = key(request);
        Attempt attempt = attempts.get(key);

        if (attempt == null || attempt.lockedUntil == null) {
            return false;
        }

        if (Instant.now().isAfter(attempt.lockedUntil)) {
            attempts.remove(key);
            return false;
        }

        return true;
    }

    public void recordFailure(HttpServletRequest request) {
        String key = key(request);

        attempts.compute(key, (k, existing) -> {
            Instant now = Instant.now();

            if (existing == null || existing.isExpired(now)) {
                existing = new Attempt(0, null);
            }

            int newCount = existing.count + 1;
            Instant lockedUntil = newCount >= maxAttempts
                ? now.plus(lockoutDuration)
                : null;

            return new Attempt(newCount, lockedUntil);
        });
    }

    public void loginSucceeded(HttpServletRequest request) {
        attempts.remove(key(request));
    }

    public long getRemainingLockoutSeconds(HttpServletRequest request) {
        Attempt attempt = attempts.get(key(request));

        if (attempt == null || attempt.lockedUntil == null) {
            return 0;
        }

        long remaining = Duration.between(Instant.now(), attempt.lockedUntil).getSeconds();

        if (remaining <= 0) {
            attempts.remove(key(request));
            return 0;
        }

        return remaining;
    }

    private String key(HttpServletRequest request) {
        return "ip:" + clientIp(request);
    }

    private String clientIp(HttpServletRequest request) {
        String cloudflareIp = request.getHeader("CF-Connecting-IP");
        if (cloudflareIp != null && !cloudflareIp.isBlank()) {
            return cloudflareIp.trim();
        }

        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }

    private static final class Attempt {
        private final int count;
        private final Instant lockedUntil;

        private Attempt(int count, Instant lockedUntil) {
            this.count = count;
            this.lockedUntil = lockedUntil;
        }

        private boolean isExpired(Instant now) {
            return lockedUntil != null && now.isAfter(lockedUntil);
        }
    }
}