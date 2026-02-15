package com.karim.portfolio;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class LoginPageController {
    // Gate page: shows the entire login form
    @GetMapping("/projects-entry")
    public String projectsEntry(Authentication auth) {
        if (auth != null && auth.isAuthenticated() && !(auth instanceof AnonymousAuthenticationToken)) {
            return "redirect:/projects";
        }
        return "login";
    }

    // Projects page (guests can only view, admins(me) get the "Add" feature)
    @GetMapping("/projects")
    public String projects() {
        return "projects";
    }

    // Home route (optional if you convert index to Thymeleaf later)
    @GetMapping("/login")
    public String home() {
        return "login";
    }
}
