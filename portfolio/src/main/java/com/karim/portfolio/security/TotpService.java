package com.karim.portfolio.security;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Locale;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.apache.commons.codec.binary.Base32;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;

@Service
public class TotpService {

    private final TimeBasedOneTimePasswordGenerator totpGenerator;
    private final SecretKey secretKey;

    public TotpService(@Value("${portfolio.admin.totp-secret:}") String base32Secret) {
        if (base32Secret == null || base32Secret.isBlank()) {
            throw new IllegalStateException(
                "Set portfolio.admin.totp-secret / PORTFOLIO_ADMIN_TOTP_SECRET"
            );
        }

        this.totpGenerator = new TimeBasedOneTimePasswordGenerator();

        String cleanedSecret = base32Secret
            .replace(" ", "")
            .toUpperCase(Locale.ROOT);

        byte[] keyBytes = new Base32().decode(cleanedSecret);

        this.secretKey = new SecretKeySpec(
            keyBytes,
            totpGenerator.getAlgorithm()
        );
    }

    public boolean verifyCode(String userCode) {
        if (userCode == null || !userCode.matches("\\d{6}")) {
            return false;
        }

        Instant now = Instant.now();

        for (int offset = -1; offset <= 1; offset++) {
            Instant timeToCheck = now.plusSeconds(30L * offset);

            try {
                String expectedCode = totpGenerator.generateOneTimePasswordString(
                    secretKey,
                    timeToCheck
                );

                if (constantTimeEquals(expectedCode, userCode)) {
                    return true;
                }

            } catch (InvalidKeyException e) {
                throw new IllegalStateException("Invalid TOTP secret key", e);
            }
        }

        return false;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            actual.getBytes(StandardCharsets.UTF_8)
        );
    }
}
