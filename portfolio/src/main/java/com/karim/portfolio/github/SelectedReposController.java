package com.karim.portfolio.github;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/*
 * Guests can read the selected repositories.
 * Only ADMIN can update them.
 */
@RestController
public class SelectedReposController {

    private final SelectedReposService selectedReposService;

    public SelectedReposController(SelectedReposService selectedReposService) {
        this.selectedReposService = selectedReposService;
    }

    @GetMapping("/api/selected-repos")
    public List<String> getSelectedRepos() {
        return selectedReposService.getSelectedRepoNames();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/api/selected-repos")
    public List<String> saveSelectedRepos(@RequestBody List<String> repoNames) {
        return selectedReposService.saveSelectedRepoNames(repoNames);
    }
}