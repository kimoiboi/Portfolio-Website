package com.karim.portfolio.blog;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageOutputStream;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RequestMapping("/api/blog")
@RestController
public class BlogPostController {

    private static final int MAX_IMAGE_DIMENSION = 1600;

    private static final int RECOMPRESS_THRESHOLD_BYTES = 900_000;

    @Value("${portfolio.uploads-dir}")
    private String uploadsDir;

    private final BlogPostRepository blogPostRepository;

    public BlogPostController(BlogPostRepository blogPostRepository) {
        this.blogPostRepository = blogPostRepository;
    }

    /*
     * Saves to the persistent disk (uploads-dir), served back through the
     * existing /images/** static handler in StaticResourceConfig.
     *
     * Oversized uploads are downscaled/recompressed first, so a 2160x2880
     * phone photo lands on disk as a ~1200x1600 JPEG instead of 1.3 MB+.
     */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/upload-image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam("image") MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            ProcessedImage processed = processForStorage(image.getBytes(), image.getContentType());

            String filename = System.currentTimeMillis()
                + "-"
                + buildSafeFilename(image.getOriginalFilename(), processed.contentType());

            Path uploadDir = Paths.get(uploadsDir, "images");

            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }

            Path target = uploadDir.resolve(filename).normalize();

            /* Belt and suspenders: never write outside the uploads directory */
            if (!target.startsWith(uploadDir)) {
                return ResponseEntity.badRequest().build();
            }

            Files.write(target, processed.bytes());

            Map<String, String> resp = new HashMap<>();
            resp.put("imageUrl", "/images/" + filename);

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

        String content = HtmlReset.sanitize(request.content());

        if (content == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content is required");
        }

        BlogPost post = new BlogPost();
        post.setTitle(title);
        post.setUrl(url);
        post.setSummary(HtmlReset.sanitize(request.summary()));
        post.setImageUrl(cleanOptionalText(request.imageUrl()));
        post.setContent(content);
        post.setStatus(BlogPostStatus.PUBLISHED);
        post.setPublishedAt(OffsetDateTime.now());

        BlogPost savedPost = blogPostRepository.save(post);

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(toDetail(savedPost));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/posts/{id}")
    public ResponseEntity<BlogPostDTO.Detail> updatePost(
        @PathVariable Long id,
        @RequestBody BlogPostDTO.CreateRequest request
    ) {
        BlogPost post = blogPostRepository
            .findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blog post not found"));

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

        if (blogPostRepository.existsByUrlAndIdNot(url, id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A post with this URL already exists");
        }

        String content = HtmlReset.sanitize(request.content());

        if (content == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content is required");
        }

        post.setTitle(title);
        post.setUrl(url);
        post.setSummary(HtmlReset.sanitize(request.summary()));
        post.setImageUrl(cleanOptionalText(request.imageUrl()));
        post.setContent(content);

        BlogPost savedPost = blogPostRepository.save(post);

        return ResponseEntity.ok(toDetail(savedPost));
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

    /*
     * Builds a URL-safe filename: base name slugified, extension taken from
     * the stored content type so a recompressed PNG-to-JPEG gets ".jpg".
     * Also prevents path tricks like "../../evil" in the original name.
     */
    private String buildSafeFilename(String originalFilename, String contentType) {
        String base = originalFilename == null ? "image" : originalFilename;

        int dot = base.lastIndexOf('.');
        String originalExt = dot >= 0 ? base.substring(dot + 1) : "";

        if (dot >= 0) {
            base = base.substring(0, dot);
        }

        base = slugify(base);

        if (base.isBlank()) {
            base = "image";
        }

        String ext;
        if (MediaType.IMAGE_JPEG_VALUE.equalsIgnoreCase(contentType)) {
            ext = "jpg";
        } else if (MediaType.IMAGE_PNG_VALUE.equalsIgnoreCase(contentType)) {
            ext = "png";
        } else if (MediaType.IMAGE_GIF_VALUE.equalsIgnoreCase(contentType)) {
            ext = "gif";
        } else if ("image/webp".equalsIgnoreCase(contentType)) {
            ext = "webp";
        } else {
            ext = originalExt.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
            if (ext.isBlank()) {
                ext = "img";
            }
        }

        return base + "." + ext;
    }

    private record ProcessedImage(byte[] bytes, String contentType) {
    }

    private ProcessedImage processForStorage(byte[] originalBytes, String declaredContentType) throws IOException {
        BufferedImage source;

        try {
            source = ImageIO.read(new ByteArrayInputStream(originalBytes));
        } catch (IOException e) {
            source = null;
        }

        /* Formats ImageIO can't decode (webp, some gifs) are stored untouched */
        if (source == null) {
            String fallbackType = (declaredContentType != null && declaredContentType.startsWith("image/"))
                ? declaredContentType
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;

            return new ProcessedImage(originalBytes, fallbackType);
        }

        int width = source.getWidth();
        int height = source.getHeight();
        int maxSide = Math.max(width, height);

        boolean isPng = MediaType.IMAGE_PNG_VALUE.equalsIgnoreCase(declaredContentType);
        boolean keepPng = isPng && source.getColorModel().hasAlpha();

        if (maxSide <= MAX_IMAGE_DIMENSION && originalBytes.length <= RECOMPRESS_THRESHOLD_BYTES) {
            String type = (declaredContentType != null && declaredContentType.startsWith("image/"))
                ? declaredContentType
                : (keepPng ? MediaType.IMAGE_PNG_VALUE : MediaType.IMAGE_JPEG_VALUE);

            return new ProcessedImage(originalBytes, type);
        }

        double scale = Math.min(1.0, (double) MAX_IMAGE_DIMENSION / maxSide);
        int newWidth = Math.max(1, (int) Math.round(width * scale));
        int newHeight = Math.max(1, (int) Math.round(height * scale));

        BufferedImage resized = new BufferedImage(
            newWidth,
            newHeight,
            keepPng ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB
        );

        Graphics2D graphics = resized.createGraphics();
        graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);

        if (!keepPng) {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, newWidth, newHeight);
        }

        graphics.drawImage(source, 0, 0, newWidth, newHeight, null);
        graphics.dispose();

        ByteArrayOutputStream out = new ByteArrayOutputStream();

        if (keepPng) {
            ImageIO.write(resized, "png", out);
            return new ProcessedImage(out.toByteArray(), MediaType.IMAGE_PNG_VALUE);
        }

        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(0.85f);

        try (MemoryCacheImageOutputStream imageOut = new MemoryCacheImageOutputStream(out)) {
            writer.setOutput(imageOut);
            writer.write(null, new IIOImage(resized, null, null), param);
        } finally {
            writer.dispose();
        }

        return new ProcessedImage(out.toByteArray(), MediaType.IMAGE_JPEG_VALUE);
    }
}
