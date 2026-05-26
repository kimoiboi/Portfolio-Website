package com.karim.portfolio.blog;

import java.time.OffsetDateTime;

public class BlogPostDTO {

    public record Summary(
        Long id,
        String title,
        String url,
        String summary,
        String imageUrl,
        OffsetDateTime publishedAt
    ) {}

    public record Detail(
        Long id,
        String title,
        String url,
        String summary,
        String imageUrl,
        String content,
        OffsetDateTime publishedAt,
        OffsetDateTime updatedAt
    ) {}

    public record CreateRequest(
        String title,
        String url,
        String summary,
        String imageUrl,
        String content
    ) {}
}
