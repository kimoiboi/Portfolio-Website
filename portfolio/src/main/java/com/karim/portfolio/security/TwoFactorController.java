package com.karim.portfolio.security;

import java.util.List;
import java.util.Map;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

@Controller
public class TwoFactorController {

    public static final String PRE_2FA_USERNAME = "PRE_2FA_USERNAME";
    public static final String PRE_2FA_REDIRECT = "PRE_2FA_REDIRECT";

    private final TotpService totpService;
    private final UserDetailsService userDetailsService;
    private final SecurityContextRepository securityContextRepository;
    private final LoginAttemptService loginAttemptService;

    public TwoFactorController(
        TotpService totpService,
        UserDetailsService userDetailsService,
        SecurityContextRepository securityContextRepository,
        LoginAttemptService loginAttemptService
    ) {
        this.totpService = totpService;
        this.userDetailsService = userDetailsService;
        this.securityContextRepository = securityContextRepository;
        this.loginAttemptService = loginAttemptService;
    }

    @PostMapping("/2fa")
    public String verifyTwoFactorCode(
        @RequestParam Map<String, String> formValues,
        HttpServletRequest request,
        HttpServletResponse response,
        RedirectAttributes redirectAttributes
    ) {
        HttpSession session = request.getSession(false);

        if (session == null || session.getAttribute(PRE_2FA_USERNAME) == null) {
            return "redirect:/login";
        }

        String username = session.getAttribute(PRE_2FA_USERNAME).toString();

        if (loginAttemptService.isBlocked(request)) {
            clearPre2fa(session);
            SecurityContextHolder.clearContext();
            return "redirect:/login?locked";
        }

        String code = buildSixDigitCode(formValues);

        if (!totpService.verifyCode(code)) {
            loginAttemptService.recordFailure(request);

            if (loginAttemptService.isBlocked(request)) {
                clearPre2fa(session);
                SecurityContextHolder.clearContext();
                return "redirect:/login?locked";
            }

            redirectAttributes.addFlashAttribute("totpError", true);
            return "redirect:/login";
        }

        loginAttemptService.loginSucceeded(request);

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);

        UsernamePasswordAuthenticationToken finalAuthentication =
            new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
            );

        finalAuthentication.setDetails(
            new WebAuthenticationDetailsSource().buildDetails(request)
        );

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(finalAuthentication);
        SecurityContextHolder.setContext(securityContext);

        securityContextRepository.saveContext(securityContext, request, response);

        String redirect = (session.getAttribute(PRE_2FA_REDIRECT) != null)
            ? session.getAttribute(PRE_2FA_REDIRECT).toString()
            : "/projects";

        clearPre2fa(session);

        return "redirect:" + redirect;
    }

    private void clearPre2fa(HttpSession session) {
        session.removeAttribute(PRE_2FA_USERNAME);
        session.removeAttribute(PRE_2FA_REDIRECT);
    }

    @GetMapping("/2fa/cancel")
    public String cancelTwoFactor(HttpSession session) {
        String redirect = "/projects";

        if (session != null) {
            if (session.getAttribute(PRE_2FA_USERNAME) != null) {
                session.removeAttribute(PRE_2FA_USERNAME);
            }

            if (session.getAttribute(PRE_2FA_REDIRECT) != null) {
                redirect = session.getAttribute(PRE_2FA_REDIRECT).toString();
                session.removeAttribute(PRE_2FA_REDIRECT);
            }
        }

        SecurityContextHolder.clearContext();

        return "redirect:" + redirect;
    }

    private String buildSixDigitCode(Map<String, String> formValues) {
        List<String> digits = List.of(
            formValues.getOrDefault("digit1", ""),
            formValues.getOrDefault("digit2", ""),
            formValues.getOrDefault("digit3", ""),
            formValues.getOrDefault("digit4", ""),
            formValues.getOrDefault("digit5", ""),
            formValues.getOrDefault("digit6", "")
        );

        return String.join("", digits).trim();
    }
}