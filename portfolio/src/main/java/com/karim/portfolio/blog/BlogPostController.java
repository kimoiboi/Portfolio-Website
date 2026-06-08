package com.karim.portfolio.blog;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RequestMapping("/api/blog")
@RestController
public class BlogPostController {
    @Value("${portfolio.uploads-dir}")
    private String uploadsDir;

    private final BlogPostRepository blogPostRepository;

    public BlogPostController(BlogPostRepository blogPostRepository) {
        this.blogPostRepository = blogPostRepository;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("image") MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            String originalFilename = StringUtils.cleanPath(image.getOriginalFilename());
            String filename = System.currentTimeMillis() + "-" + originalFilename;

            Path uploadDir = Paths.get(uploadsDir, "images");

            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            Path target = uploadDir.resolve(filename).normalize();

            Files.copy(image.getInputStream(), target);

            String imageUrl = "/images/" + filename;

            Map<String, String> resp = new HashMap<>();
            resp.put("imageUrl", imageUrl);

            return ResponseEntity.ok(resp);

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/posts")
    public List<BlogPostDTO.Summary> getPublishedPosts() {
        return blogPostRepository
            .findByStatusOrderByPublishedAtDesc(BlogPostStatus.PUBLISHED)
            .stream()
            .map(post -> new BlogPostDTO.Summary(
                post.getId(),
                post.getTitle(),
                post.getUrl(),
                post.getSummary(),
                post.getImageUrl(),
                post.getPublishedAt()
            ))
            .toList();
    }

    @GetMapping("/posts/{url}")
    public ResponseEntity<BlogPostDTO.Detail> getPublishedPostByUrl(
        @PathVariable String url
    ) {
        return blogPostRepository
            .findByUrlAndStatus(url, BlogPostStatus.PUBLISHED)
            .map(post -> ResponseEntity.ok(toDetail(post)))
            .orElse(ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/posts")
    public ResponseEntity<BlogPostDTO.Detail> createPost(
        @RequestBody BlogPostDTO.CreateRequest request
    ) {
        if (request.title() == null || request.title().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title is required");
        }

        if (request.content() == null || request.content().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content is required");
        }

        String title = request.title().trim();

        String url = request.url();
        if (url == null || url.isBlank()) {
            url = slugify(title);
        } else {
            url = slugify(url);
        }

        if (blogPostRepository.existsByUrl(url)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A post with this URL already exists");
        }

        BlogPost post = new BlogPost();
        post.setTitle(title);
        post.setUrl(url);
        post.setSummary(cleanOptionalText(request.summary()));
        post.setImageUrl(cleanOptionalText(request.imageUrl()));
        post.setContent(request.content().trim());
        post.setStatus(BlogPostStatus.PUBLISHED);
        post.setPublishedAt(OffsetDateTime.now());

        BlogPost savedPost = blogPostRepository.save(post);

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(toDetail(savedPost));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> deletePost(@PathVariable Long id) {
        if (!blogPostRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        blogPostRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private BlogPostDTO.Detail toDetail(BlogPost post) {
        return new BlogPostDTO.Detail(
            post.getId(),
            post.getTitle(),
            post.getUrl(),
            post.getSummary(),
            post.getImageUrl(),
            post.getContent(),
            post.getPublishedAt()
        );
    }

    private String cleanOptionalText(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }

        return text.trim();
    }

    private String slugify(String input) {
        return input
            .toLowerCase(Locale.ROOT)
            .trim()
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-|-$", "");
    }
}