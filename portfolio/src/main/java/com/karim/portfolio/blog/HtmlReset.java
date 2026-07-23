package com.karim.portfolio.blog;

import java.util.List;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;

public final class HtmlReset {

    private static final List<String> ALLOWED_IFRAME_PREFIXES = List.of(
        "https://www.youtube.com/embed/",
        "https://www.youtube-nocookie.com/embed/",
        "https://player.vimeo.com/video/"
    );

    private static final Safelist POST_SAFELIST = Safelist.relaxed()
        .addTags("s", "iframe", "video")
        .addAttributes("iframe", "src", "title", "allow", "allowfullscreen", "frameborder", "loading")
        .addAttributes("video", "src", "controls", "preload", "class")
        .addAttributes("div", "class")
        .addAttributes("img", "class", "loading")
        .preserveRelativeLinks(true)
        .addProtocols("a", "href", "http", "https", "mailto")
        .addProtocols("img", "src", "http", "https")
        .addProtocols("iframe", "src", "https")
        .addProtocols("video", "src", "https");

    private HtmlReset() {
    }

    public static String sanitize(String html) {
        if (html == null || html.isBlank()) {
            return null;
        }

        Document dirty = Jsoup.parseBodyFragment(html);
        Document clean = new Cleaner(POST_SAFELIST).clean(dirty);

        clean.outputSettings().prettyPrint(false);

        for (Element iframe : clean.select("iframe")) {
            String src = iframe.attr("src");

            boolean allowed = ALLOWED_IFRAME_PREFIXES
                .stream()
                .anyMatch(src::startsWith);

            if (!allowed) {
                iframe.remove();
            } else {
                iframe.attr("loading", "lazy");
            }
        }

        for (Element anchor : clean.select("a")) {
            anchor.attr("target", "_blank");
            anchor.attr("rel", "noopener noreferrer");
        }

        for (Element img : clean.select("img")) {
            img.attr("loading", "lazy");
        }

        String result = clean.body().html().trim();

        return result.isBlank() ? null : result;
    }
}
