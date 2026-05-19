package com.karim.portfolio;

import com.karim.portfolio.security.TwoFactorController;

import jakarta.servlet.http.HttpSession;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginPageController {

    @GetMapping("/projects-entry")
    public String projectsEntry(Authentication auth) {
        if (isFullyAuthenticated(auth)) {
            return "redirect:/projects";
        }

        return "redirect:/login";
    }

    @GetMapping("/projects")
    public String projects() {
        return "projects";
    }

    @GetMapping("/login")
    public String login(Authentication auth, HttpSession session, Model model) {
        if (isFullyAuthenticated(auth)) {
            return "redirect:/projects";
        }

        boolean waitingForTwoFactor = session != null
            && session.getAttribute(TwoFactorController.PRE_2FA_USERNAME) != null;

        model.addAttribute("showTwoFactor", waitingForTwoFactor);

        return "login";
    }

    private boolean isFullyAuthenticated(Authentication auth) {
        return auth != null
            && auth.isAuthenticated()
            && !(auth instanceof AnonymousAuthenticationToken);
    }
}