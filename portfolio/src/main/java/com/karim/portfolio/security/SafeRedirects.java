package com.karim.portfolio.security;

import java.net.URI;

public final class SafeRedirects {

    private static final String DEFAULT = "/projects";

    private SafeRedirects() {
    }

    public static String sanitize(String target) {
        if (target == null || target.isBlank()) {
            return DEFAULT;
        }

        String trimmed = target.trim();

        if (!trimmed.startsWith("/")
            || trimmed.startsWith("//")
            || trimmed.startsWith("/\\")
            || trimmed.contains("://")
            || trimmed.contains("\r")
            || trimmed.contains("\n")) {
            return DEFAULT;
        }

        return trimmed;
    }

    public static String sanitizeReferer(String referer) {
        if (referer == null || referer.isBlank()) {
            return DEFAULT;
        }

        try {
            URI uri = URI.create(referer.trim());
            String host = uri.getHost();

            if (host == null) {
                return sanitize(referer);
            }

            if (!host.equalsIgnoreCase("karimcodes.net")
                && !host.equalsIgnoreCase("www.karimcodes.net")) {
                return DEFAULT;
            }

            String path = (uri.getRawPath() == null || uri.getRawPath().isBlank())
                ? "/"
                : uri.getRawPath();

            if (uri.getRawQuery() != null && !uri.getRawQuery().isBlank()) {
                path = path + "?" + uri.getRawQuery();
            }

            return sanitize(path);

        } catch (IllegalArgumentException e) {
            return DEFAULT;
        }
    }
}
