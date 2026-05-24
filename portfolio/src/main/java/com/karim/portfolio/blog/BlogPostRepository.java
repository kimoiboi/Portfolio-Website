package com.karim.portfolio.blog;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    List<BlogPost> findByStatusOrderByPublishedAtDesc(BlogPostStatus status);

    Optional<BlogPost> findByUrlAndStatus(String url, BlogPostStatus status);

    boolean existsByUrl(String url);
}