package com.karim.portfolio;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.karim.portfolio.security.TwoFactorController;

import jakarta.servlet.http.HttpSession;

@Controller
public class LoginPageController {

    @GetMapping("/projects-entry")
    public String projectsEntry(Authentication auth) {
        if (isFullyAuthenticated(auth)) {
            return "redirect:/projects";
        }

        return "redirect:/login?redirect=/projects";
    }

    @GetMapping("/blogs-entry")
    public String blogsEntry(Authentication auth) {
        if (isFullyAuthenticated(auth)) {
            return "redirect:/blog";
        }
        return "redirect:/login?redirect=/blog";
    }

    @GetMapping("/blog/{url}")
    public String blogPostDetail() {
        return "blog-post";
    }

    @GetMapping("/projects")
    public String projects(jakarta.servlet.http.HttpServletRequest request, Model model) {
        model.addAttribute("currentPath", request.getRequestURI());
        return "projects";
    }

    @GetMapping("/login")
    public String login(Authentication auth, HttpSession session, Model model, jakarta.servlet.http.HttpServletRequest request) {
        String redirectParam = request.getParameter("redirect");

        if (isFullyAuthenticated(auth)) {
            return "redirect:" + (redirectParam != null && !redirectParam.isBlank() ? redirectParam : "/projects");
        }

        boolean waitingForTwoFactor = session != null
            && session.getAttribute(TwoFactorController.PRE_2FA_USERNAME) != null;

        model.addAttribute("showTwoFactor", waitingForTwoFactor);
        model.addAttribute("continueUrl", redirectParam != null && !redirectParam.isBlank() ? redirectParam : "/projects");

        return "login";
    }

    @GetMapping({"/blog", "/blog.html"})
    public String blog(jakarta.servlet.http.HttpServletRequest request, Model model) {
        model.addAttribute("currentPath", request.getRequestURI());
        return "blog";
    }

    private boolean isFullyAuthenticated(Authentication auth) {
        return auth != null
            && auth.isAuthenticated()
            && !(auth instanceof AnonymousAuthenticationToken);
    }
}