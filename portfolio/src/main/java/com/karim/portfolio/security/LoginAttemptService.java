package com.karim.portfolio.security;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class LoginAttemptService {

    private final String adminUsername;
    private final int maxAttempts;
    private final Duration lockoutDuration;

    private final ConcurrentHashMap<String, Attempt> attempts = new ConcurrentHashMap<>();

    public LoginAttemptService(
        @Value("${portfolio.admin.username:}") String adminUsername,
        @Value("${portfolio.login.max-attempts:}") int maxAttempts,
        @Value("${portfolio.login.lockout-minutes:}") long lockoutMinutes
    ) {
        this.adminUsername = adminUsername == null ? "" : adminUsername.trim();
        this.maxAttempts = maxAttempts;
        this.lockoutDuration = Duration.ofMinutes(lockoutMinutes);
    }

    public boolean isBlocked(String username) {
        if (!isAdmin(username)) {
            return false;
        }

        Attempt attempt = attempts.get(key());
        if (attempt == null || attempt.count < maxAttempts) {
            return false;
        }

        if (Instant.now().isAfter(attempt.lockedAt.plus(lockoutDuration))) {
            attempts.remove(key());
            return false;
        }

        return true;
    }

    public void recordFailure(String username) {
        if (!isAdmin(username)) {
            return;
        }

        attempts.compute(key(), (k, existing) -> {
            Instant now = Instant.now();

            if (existing == null) {
                return new Attempt(1, now);
            }

            if (existing.count >= maxAttempts
                    && now.isAfter(existing.lockedAt.plus(lockoutDuration))) {
                return new Attempt(1, now);
            }

            if (existing.count >= maxAttempts) {
                return existing;
            }

            int newCount = existing.count + 1;
            Instant lockedAt = (newCount >= maxAttempts) ? now : existing.lockedAt;
            return new Attempt(newCount, lockedAt);
        });
    }

    public void loginSucceeded(String username) {
        if (isAdmin(username)) {
            attempts.remove(key());
        }
    }

    public long getRemainingLockoutSeconds(String username) {
        if (!isAdmin(username)) {
            return 0;
        }
        Attempt attempt = attempts.get(key());
        if (attempt == null || attempt.count < maxAttempts) {
            return 0;
        }
        long remaining = Duration.between(Instant.now(),
                attempt.lockedAt.plus(lockoutDuration)).getSeconds();
        return Math.max(remaining, 0);
    }

    private boolean isAdmin(String username) {
        return username != null && username.trim().equalsIgnoreCase(adminUsername);
    }

    private String key() {
        return adminUsername.toLowerCase();
    }

    private static final class Attempt {
        private final int count;
        private final Instant lockedAt;

        private Attempt(int count, Instant lockedAt) {
            this.count = count;
            this.lockedAt = lockedAt;
        }
    }
}
