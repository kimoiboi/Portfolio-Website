package com.karim.portfolio.github;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class SelectedReposService {

    private static final int MAX_SELECTED_REPOS = 20;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Path selectedReposPath;
    private final GitHubService gitHubService;

    public SelectedReposService(
        GitHubService gitHubService,
        @Value("${portfolio.selected-repos-file:selected-repos.json}") String selectedReposFile
    ) {
        this.gitHubService = gitHubService;
        this.selectedReposPath = Paths.get(selectedReposFile).toAbsolutePath().normalize();
    }

    public synchronized List<String> getSelectedRepoNames() {
        if (!Files.exists(selectedReposPath)) {
            return List.of();
        }

        try {
            List<String> savedRepoNames = objectMapper.readValue(
                selectedReposPath.toFile(),
                new TypeReference<List<String>>() {}
            );

            return savedRepoNames == null ? List.of() : savedRepoNames;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read selected repositories", e);
        }
    }

    public synchronized List<String> saveSelectedRepoNames(List<String> repoNames) {
        if (repoNames == null) {
            repoNames = List.of();
        }

        /*
         * Security protection:
         * Do not trust the browser blindly.
         * The browser is only allowed to submit repo names.
         * This verifies that every submitted name really exists in your GitHub repo list.
         */
        Set<String> allowedRepoNames = gitHubService.listRepos()
            .stream()
            .map(RepoDTO.Repo::name)
            .collect(Collectors.toSet());

        List<String> cleanedRepoNames = repoNames.stream()
            .filter(name -> name != null && !name.isBlank())
            .map(String::trim)
            .filter(allowedRepoNames::contains)
            .distinct()
            .limit(MAX_SELECTED_REPOS)
            .toList();

        try {
            Path parent = selectedReposPath.getParent();

            if (parent != null) {
                Files.createDirectories(parent);
            }

            objectMapper.writerWithDefaultPrettyPrinter()
                .writeValue(selectedReposPath.toFile(), cleanedRepoNames);

            return cleanedRepoNames;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not save selected repositories", e);
        }
    }
}