package com.karim.portfolio.github;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class GitHubController {

    private final GitHubService service;

    public GitHubController(GitHubService service) {
        this.service = service;
    }

    @GetMapping("/api/github/repos")
    public List<RepoDTO.Repo> repos() {
        return service.listRepos();
    }
}