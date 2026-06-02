/* Adjusted the way it scrolls down when clicking on email icon at bottom of page (Help a little with AI) */
(function(){
    const contactForm = document.getElementById("contact-form");
    const contactLinks = document.querySelectorAll('a[href="#contact-form"]');

    if (!contactForm || contactLinks.length === 0) return;

    contactLinks.forEach(function(link){
        link.addEventListener("click", function(e){
            e.preventDefault();

            const isOpening = !contactForm.classList.contains("open");
            contactForm.classList.toggle("open");

            if (isOpening) {
                setTimeout(function(){
                    contactForm.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 100);

                setTimeout(function(){
                    window.scrollTo({
                        top: document.documentElement.scrollHeight,
                        behavior: "smooth"
                    });
                }, 1000);
            }
        });
    });
})();

(function(){
    const addButton = document.getElementById('set-dropdown');
    const dropdown = document.getElementById('dropdown');
    if(!addButton || !dropdown) return;

    dropdown.classList.remove("show"); // This removes the display "block" -> "none"
    dropdown.setAttribute("aria-hidden", "true");

    addButton.addEventListener("click", function(e){
        e.preventDefault();
        const isShown = dropdown.classList.toggle("show");
        dropdown.setAttribute("aria-hidden", (!isShown).toString());
    });

    // Close the blog admin modal when Cancel clicked
    const blogCancel = document.getElementById('blogCancel');
    if (blogCancel){
        blogCancel.addEventListener('click', function(e){
            e.preventDefault();
            dropdown.classList.remove('show');
            dropdown.setAttribute('aria-hidden', 'true');
        });
    }

    document.addEventListener("click", function(e){
        if (dropdown.classList.contains("show")){
            if (!dropdown.contains(e.target) && !addButton.contains(e.target)){
                dropdown.classList.remove("show");
                dropdown.setAttribute("aria-hidden", "true");
            }
        }
    });

    document.addEventListener("keydown", function(e){
        if (e.key === "Escape" && dropdown.classList.contains("show")){
            dropdown.classList.remove("show");
            dropdown.setAttribute("aria-hidden", "true");
        }
    });
})();

// GitHub API Integration with Server-Side Persistence
(function(){
    const dropdown = document.getElementById("dropdown");
    const projectsContainer = document.querySelector(".recent-project-box");
    const isAdmin = !!dropdown;

    if(!projectsContainer){
        return;
    }

    let allRepos = [];

    function getCsrfHeaders(){
        const token = document.querySelector('meta[name="_csrf"]')?.getAttribute("content");
        const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute("content");

        const headers = {
            "Content-Type": "application/json"
        };

        if(token && header){
            headers[header] = token;
        }

        return headers;
    }

    async function fetchGitHubRepos(){
        try{
            const response = await fetch("/api/github/repos");

            if(!response.ok){
                console.error("Failed to fetch GitHub repositories: ", response.status);
                return [];
            }

            return await response.json();
        }catch(error){
            console.error("Error fetching GitHub repositories: ", error);
            return [];
        }
    }

    async function fetchSelectedRepoNames(){
        try{
            const response = await fetch("/api/selected-repos");

            if(!response.ok){
                console.error("Failed to fetch selected repositories: ", response.status);
                return [];
            }

            return await response.json();
        }catch(error){
            console.error("Error fetching selected repositories: ", error);
            return [];
        }
    }

    async function saveSelectedRepos(){
        if(!isAdmin){
            return;
        }

        const selectedCards = projectsContainer.querySelectorAll(".repo-card");
        const repoNames = Array.from(selectedCards).map(card => card.dataset.repoName);

        try{
            const response = await fetch("/api/selected-repos", {
                method: "POST",
                headers: getCsrfHeaders(),
                body: JSON.stringify(repoNames)
            });

            if(!response.ok){
                console.error("Failed to save selected repositories: ", response.status);
            }
        }catch(error){
            console.error("Error saving selected repositories: ", error);
        }
    }

    function findExistingCard(repoName){
        return Array.from(projectsContainer.querySelectorAll(".repo-card"))
            .find(card => card.dataset.repoName === repoName);
    }

    function populateDropdown(repos){
        if(!dropdown){
            return;
        }

        const dropdownList = dropdown.querySelector("ul");

        if(!dropdownList){
            return;
        }

        dropdownList.innerHTML = "";

        if(repos.length === 0){
            dropdownList.innerHTML = '<li><a href="#">No Repositories Found</a></li>';
            return;
        }

        repos.forEach((repo, index) => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.justifyContent = "space-between";

            const a = document.createElement("a");
            a.href = "#";
            a.textContent = repo.name;
            a.dataset.repoIndex = index;
            a.style.flex = "1";
            a.style.marginRight = "8px";

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "dropdown-delete-btn";
            delBtn.title = "Delete Repository Card";
            delBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            delBtn.dataset.repoIndex = index;

            delBtn.addEventListener("click", function(e){
                e.stopPropagation();
                e.preventDefault();

                const idx = parseInt(this.dataset.repoIndex);
                const selectedRepo = repos[idx];

                if(!selectedRepo){
                    return;
                }

                const existingCard = findExistingCard(selectedRepo.name);

                if(existingCard){
                    removeCard(existingCard);
                }
            });

            li.appendChild(a);
            li.appendChild(delBtn);
            dropdownList.appendChild(li);

            if(index < repos.length - 1){
                const hr = document.createElement("hr");
                hr.style.width = "88%";
                dropdownList.appendChild(hr);
            }
        });
    }

    function createProjectCard(repo){
        const card = document.createElement("div");
        card.className = "repo-card";
        card.dataset.repoName = repo.name;

        const description = repo.description || "No description available";
        const formattedDate = repo.updatedAt ? new Date(repo.updatedAt).toLocaleDateString("en-us", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }) : "Unknown";

        const box = document.createElement("div");
        box.className = "repo-card-descr-box";

        const label = document.createElement("label");
        label.className = "project-select";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        label.appendChild(checkbox);

        const title = document.createElement("p");
        title.className = "repo-card-title";
        title.textContent = repo.name;

        const descr = document.createElement("p");
        descr.className = "repo-card-descr";
        descr.textContent = description;

        const links = document.createElement("div");
        links.className = "repo-card-links";

        const updated = document.createElement("div");
        updated.className = "repo-updated";
        updated.textContent = "Last updated: " + formattedDate;

        links.appendChild(updated);

        if(repo.htmlUrl){
            const linkWrapper = document.createElement("div");

            const link = document.createElement("a");
            link.className = "link";
            link.href = repo.htmlUrl;
            link.target = "_blank";
            link.rel = "noopener noreferrer";

            const icon = document.createElement("i");
            icon.className = "fas fa-paperclip";
            icon.style.fontSize = "17.6px";
            icon.style.color = "white";
            icon.style.alignItems = "center";

            link.appendChild(icon);
            link.appendChild(document.createTextNode("View"));

            linkWrapper.appendChild(link);
            links.appendChild(linkWrapper);
        }

        box.appendChild(label);
        box.appendChild(title);
        box.appendChild(descr);
        box.appendChild(links);
        card.appendChild(box);

        return card;
    }

    function removeCard(card){
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";

        setTimeout(() => {
            card.remove();
            saveSelectedRepos();
        }, 300);
    }

    function addProjectCard(repo, animate = true, shouldSave = true){
        const existingCard = findExistingCard(repo.name);

        if(existingCard){
            return;
        }

        const card = createProjectCard(repo);

        if(animate){
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";
            projectsContainer.appendChild(card);

            setTimeout(() => {
                card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, 10);
        }else{
            projectsContainer.appendChild(card);
        }

        if(shouldSave){
            saveSelectedRepos();
        }
    }

    async function restoreSavedCards(){
        const savedRepoNames = await fetchSelectedRepoNames();

        projectsContainer.innerHTML = "";

        savedRepoNames.forEach(repoName => {
            const repo = allRepos.find(r => r.name === repoName);

            if(repo){
                addProjectCard(repo, false, false);
            }
        });
    }

    function handleRepoSelection(repos){
        if(!dropdown){
            return;
        }

        const dropdownList = dropdown.querySelector("ul");

        if(!dropdownList){
            return;
        }

        dropdownList.addEventListener("click", function(e){
            e.preventDefault();

            const link = e.target.closest("a");

            if(!link || !link.dataset.repoIndex){
                return;
            }

            const repoIndex = parseInt(link.dataset.repoIndex);
            const selectedRepo = repos[repoIndex];

            if(selectedRepo){
                const existingCard = findExistingCard(selectedRepo.name);

                if(existingCard){
                    existingCard.style.transition = "transform 0.2s ease";
                    existingCard.style.transform = "scale(1.05)";

                    setTimeout(() => {
                        existingCard.style.transform = "scale(1)";
                    }, 200);
                }else{
                    addProjectCard(selectedRepo, true, true);
                }

                dropdown.classList.remove("show");
                dropdown.setAttribute("aria-hidden", "true");
            }
        });
    }

    async function init(){
        const repos = await fetchGitHubRepos();
        allRepos = repos;

        if(repos.length > 0){
            await restoreSavedCards();
            populateDropdown(repos);
            handleRepoSelection(repos);
        }
    }

    init();
})();

// Blog API Integration
(function(){
    const blogContainer = document.getElementById("blogPostsContainer");
    const blogForm = document.getElementById("blogPostForm");
    const blogFormMessage = document.getElementById("blogFormMessage");
    const dropdown = document.getElementById("dropdown");
    const blogCancel = document.getElementById("blogCancel");
    const blogCancelBottom = document.getElementById("blogCancelBottom");

    if(!blogContainer){
        return;
    }

    const isAdmin = !!blogForm;

    function getCsrfHeaders(){
        const token = document.querySelector('meta[name="_csrf"]')?.getAttribute("content");
        const header = document.querySelector('meta[name="_csrf_header"]')?.getAttribute("content");

        const headers = {
            "Content-Type": "application/json"
        };

        if(token && header){
            headers[header] = token;
        }

        return headers;
    }

    function closeBlogModal(){
        if(dropdown){
            dropdown.classList.remove("show");
            dropdown.setAttribute("aria-hidden", "true");
        }
    }

    if(blogCancel){
        blogCancel.addEventListener("click", function(e){
            e.preventDefault();
            closeBlogModal();
        });
    }

    if(blogCancelBottom){
        blogCancelBottom.addEventListener("click", function(e){
            e.preventDefault();
            closeBlogModal();
        });
    }

    if(dropdown){
        dropdown.addEventListener("click", function(e){
            if(e.target === dropdown){
                closeBlogModal();
            }
        });
    }

    async function fetchBlogPosts(){
        try{
            const response = await fetch("/api/blog/posts");

            if(!response.ok){
                console.error("Failed to fetch blog posts:", response.status);
                return [];
            }

            return await response.json();
        }catch(error){
            console.error("Error fetching blog posts:", error);
            return [];
        }
    }

    function removeBlogCard(card){
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";

        setTimeout(() => {
            card.remove();

            if(blogContainer.querySelectorAll(".blog-post-card").length === 0){
                showEmptyBlogMessage();
            }
        }, 300);
    }

    async function deleteBlogPost(postId, card){
        if(!postId){
            removeBlogCard(card);
            return;
        }

        try{
            const response = await fetch(`/api/blog/posts/${postId}`, {
                method: "DELETE",
                headers: getCsrfHeaders()
            });

            if(!response.ok){
                console.error("Failed to delete blog post:", response.status);
                return;
            }

            removeBlogCard(card);
        }catch(error){
            console.error("Error deleting blog post:", error);
        }
    }

    function createBlogPostCard(post){
        const card = document.createElement("article");
        card.className = "blog-post-card";
        card.dataset.blogId = post.id;
        card.dataset.blogUrl = post.url;
        card.tabIndex = 0;

        function openBlogPost(){
            if(post.url){
                window.location.href = `/blog/${encodeURIComponent(post.url)}`;
            }
        }

        card.addEventListener("click", openBlogPost);

        card.addEventListener("keydown", function(e){
            if(e.key === "Enter"){
                openBlogPost();
            }
        });

        const imageWrap = document.createElement("div");
        imageWrap.className = "blog-card-image-wrap";

        const image = document.createElement("img");
        image.className = "blog-card-image";
        image.src = post.imageUrl || "/images/filler-post.jpg";
        image.alt = post.title ? `Image for ${post.title}` : "Blog post image";

        imageWrap.appendChild(image);

        const body = document.createElement("div");
        body.className = "blog-card-body";

        // Summary first, then a visual separator, then a footer area with title/date/actions
        const summary = document.createElement("p");
        summary.className = "blog-card-summary";
        summary.textContent = post.summary || "No summary available.";

        const separator = document.createElement("div");
        separator.className = "blog-card-sep";

        const footer = document.createElement("div");
        footer.className = "blog-card-footer";

        const title = document.createElement("h2");
        title.className = "blog-card-title";
        title.textContent = post.title;

        const date = document.createElement("p");
        date.className = "blog-card-date";

        if(post.publishedAt){
            date.textContent = new Date(post.publishedAt).toLocaleDateString("en-us", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        }else{
            date.textContent = "Date unavailable";
        }

        const actions = document.createElement("div");
        actions.className = "blog-card-actions";

        const readLink = document.createElement("a");
        readLink.className = "read-full-link";
        readLink.href = post.url ? `/blog/${encodeURIComponent(post.url)}` : "#";
        readLink.textContent = "Read Full Blog";

        readLink.addEventListener("click", function(e){
            e.stopPropagation();
        });

        actions.appendChild(readLink);

        if(isAdmin){
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "blog-delete-btn";
            deleteButton.title = "Delete Blog Post";
            deleteButton.innerHTML = '<i class="fa-solid fa-trash-can"></i>';

            deleteButton.addEventListener("click", function(e){
                e.preventDefault();
                e.stopPropagation();
                deleteBlogPost(post.id, card);
            });

            actions.appendChild(deleteButton);
        }

        footer.appendChild(title);
        const metaWrap = document.createElement("div");
        metaWrap.className = "blog-card-meta-wrap";
        metaWrap.appendChild(date);
        footer.appendChild(metaWrap);
        footer.appendChild(actions);

        // Image improvements: lazy loading, async decoding, and fallback on error
        image.loading = "lazy";
        try{ image.decoding = "async"; }catch(e){}
        image.addEventListener('error', function(){
            if(image.src && !image.dataset.fallback){
                image.dataset.fallback = '1';
                image.src = '/images/filler-post.jpg';
                image.classList.add('blog-card-image--fallback');
            }
        });

        body.appendChild(summary);
        body.appendChild(separator);
        body.appendChild(footer);

        card.appendChild(imageWrap);
        card.appendChild(body);

        return card;
    }

    function clearEmptyBlogMessage(){
        const emptyMessage = blogContainer.querySelector("[data-empty-blog-message]");
        if(emptyMessage){
            emptyMessage.remove();
        }
    }

    function showEmptyBlogMessage(){
        blogContainer.innerHTML = "";

        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No blog posts published yet.";
        emptyMessage.style.textAlign = "center";
        emptyMessage.dataset.emptyBlogMessage = "true";

        blogContainer.appendChild(emptyMessage);
    }

    function addBlogPostCard(post, animate = true){
        clearEmptyBlogMessage();

        const card = createBlogPostCard(post);

        if(animate){
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";
            blogContainer.prepend(card);

            setTimeout(() => {
                card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, 10);
        }else{
            blogContainer.appendChild(card);
        }
    }

    async function loadBlogPosts(){
        const posts = await fetchBlogPosts();

        blogContainer.innerHTML = "";

        if(posts.length === 0){
            showEmptyBlogMessage();
            return;
        }

        posts.forEach(post => addBlogPostCard(post, false));
    }

    async function submitBlogPost(event){
        event.preventDefault();

        if(!blogForm){
            return;
        }

        const formData = new FormData(blogForm);

        // If an image file was selected, upload it first and use returned URL
        const fileInput = blogForm.querySelector('input[name="imageFile"]');
        let imageUrl = formData.get("imageUrl");

        if(fileInput && fileInput.files && fileInput.files.length > 0){
            const uploadData = new FormData();
            uploadData.append('image', fileInput.files[0]);

            try{
                const uploadResponse = await fetch('/api/blog/upload-image', {
                    method: 'POST',
                    headers: (() => {
                        const headers = {};
                        const token = document.querySelector('meta[name="_csrf"]')?.getAttribute('content');
                        const headerName = document.querySelector('meta[name="_csrf_header"]')?.getAttribute('content');
                        if(token && headerName){ headers[headerName] = token; }
                        return headers;
                    })(),
                    body: uploadData
                });

                if(!uploadResponse.ok){
                    console.error('Failed to upload image:', uploadResponse.status);
                }else{
                    const json = await uploadResponse.json();
                    if(json && json.imageUrl){
                        imageUrl = json.imageUrl;
                        // set hidden input for record
                        const hidden = blogForm.querySelector('input[name="imageUrl"]');
                        if(hidden) hidden.value = imageUrl;
                    }
                }
            }catch(e){
                console.error('Error uploading image:', e);
            }
        }

        const payload = {
            title: formData.get("title"),
            url: formData.get("url"),
            imageUrl: imageUrl,
            summary: formData.get("summary"),
            content: formData.get("content")
        };

        try{
            const response = await fetch("/api/blog/posts", {
                method: "POST",
                headers: getCsrfHeaders(),
                body: JSON.stringify(payload)
            });

            if(!response.ok){
                console.error("Failed to create blog post:", response.status);

                if(blogFormMessage){
                    blogFormMessage.textContent = "Could not publish post. Please try again.";
                }

                return;
            }

            const createdPost = await response.json();

            addBlogPostCard(createdPost, true);
            blogForm.reset();

            if(blogFormMessage){
                blogFormMessage.textContent = "Post published!";
            }

            closeBlogModal();

        }catch(error){
            console.error("Error creating blog post:", error);

            if(blogFormMessage){
                blogFormMessage.textContent = "Error creating post.";
            }
        }
    }

    if(blogForm){
        blogForm.addEventListener("submit", submitBlogPost);
    }

    loadBlogPosts();
})();

// Single Blog Post Detail Page
(function(){
    const detailContainer = document.getElementById("blogPostDetail");

    if(!detailContainer){
        return;
    }

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    const slug = pathParts[pathParts.length - 1];

    async function loadBlogPostDetail(){
        try{
            const response = await fetch(`/api/blog/posts/${encodeURIComponent(slug)}`);

            if(!response.ok){
                detailContainer.innerHTML = "";
                const message = document.createElement("p");
                message.textContent = "Blog post not found.";
                message.style.textAlign = "center";
                detailContainer.appendChild(message);
                return;
            }

            const post = await response.json();

            renderBlogPostDetail(post);

        }catch(error){
            console.error("Error loading blog post detail:", error);

            detailContainer.innerHTML = "";
            const message = document.createElement("p");
            message.textContent = "Could not load this blog post.";
            message.style.textAlign = "center";
            detailContainer.appendChild(message);
        }
    }

    function renderBlogPostDetail(post){
        detailContainer.innerHTML = "";

        if(post.imageUrl){
            const image = document.createElement("img");
            image.className = "blog-detail-image";
            image.src = post.imageUrl;
            image.alt = post.title ? `Image for ${post.title}` : "Blog post image";
            detailContainer.appendChild(image);
        }

        const title = document.createElement("h1");
        title.className = "blog-detail-title";
        title.textContent = post.title;

        const date = document.createElement("p");
        date.className = "blog-detail-date";

        if(post.publishedAt){
            date.textContent = "Published: " + new Date(post.publishedAt).toLocaleDateString("en-us", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }else{
            date.textContent = "Published date unavailable";
        }

        const summary = document.createElement("p");
        summary.className = "blog-detail-summary";
        summary.textContent = post.summary || "";

        const content = document.createElement("div");
        content.className = "blog-detail-content";
        content.textContent = post.content || "";

        detailContainer.appendChild(title);
        detailContainer.appendChild(date);

        if(post.summary){
            detailContainer.appendChild(summary);
        }

        detailContainer.appendChild(content);

        document.title = `${post.title} · Karim Elgendi`;
    }

    loadBlogPostDetail();
})();