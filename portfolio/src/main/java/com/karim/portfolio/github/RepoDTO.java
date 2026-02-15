package com.karim.portfolio.github;

public class RepoDTO {
    // "record" is used to auto-generate a constructor, getter methods for each variables, & equals/hashCode/toString methods
    public record Repo(
        String name,
        String description,
        String htmlUrl,
        String updatedAt) {}
}