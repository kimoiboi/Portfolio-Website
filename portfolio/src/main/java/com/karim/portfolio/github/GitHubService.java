package com.karim.portfolio.github;

import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class GitHubService {

    private final RestClient client;
    private final String username;

    public GitHubService(@Value("${github.username}") String username, @Value("${github.token:}") String token) {
        this.username = username;

        RestClient.Builder b = RestClient.builder()
                .baseUrl("https://api.github.com") // This is the base URL
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json") // ACCEPT header that gets JSON responses in GitHubs recommended media type
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28") // Explicitly stating this version so no unexpected changes happen
                .defaultHeader(HttpHeaders.USER_AGENT, "karim-portfolio-app"); // GitHub expects a User Agent

        if (token != null && !token.isBlank()) {
            b.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }

        this.client = b.build(); // Builds the RestClient
    }

    // Controller method called to list the Repositories
    public List<RepoDTO.Repo> listRepos() {
        List<GitHubRepoRaw> raw = client.get() // Builds an HTTP GET request and makes a JSON list
                .uri(uriBuilder -> uriBuilder // Builds the URL request
                        .path("/users/{username}/repos") // Sets the path of the URL with a placeholder variable "username"
                        .queryParam("sort", "updated") // Sorts by the last updated repository
                        .queryParam("per_page", 100) // 100 Repositories shown per page
                        .build(username)) // Replaces the placeholder variable with the value in username
                .retrieve() // Executes & retrieves responses
                .body(new ParameterizedTypeReference<>() {}); // Read the retrieves responses to convert from JSON -> Java Object

        if (raw == null) return List.of(); // Returns an empty list if values come back as null

        return raw.stream() // Return a stream of Github Raw Object to DTO Objects to perform operations (ex: map, filter, etc.)
                // Turns each (r) into the DTO record I created in RepoDTO class
                .map(r -> new RepoDTO.Repo(
                        r.name(),
                        r.description(),
                        r.html_url(),
                        r.updated_at()
                ))
                // Keep newest updated repo first (GitHub already sorts, but this is explicit)
                .sorted(Comparator.comparing(RepoDTO.Repo::updatedAt).reversed())
                .toList(); // Collects stream back into a List

    }

    // Only used to deserialize GitHub's JSON fields (Converts JSON -> Live Object for application use)
    // "record" is used to auto-generate a constructor, getter methods for each variables, & equals/hashCode/toString methods
    private record GitHubRepoRaw(
            String name,
            String description,
            String html_url,
            String updated_at
    ) {}
}


