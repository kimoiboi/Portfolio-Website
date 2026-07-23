/* Adjusted the way it scrolls down when clicking on email icon at bottom of page (Help a little with AI) */
(function(){
    const contactSection = document.getElementById("contact-section");
    const contactNavLinks = document.querySelectorAll('a[href="#contact-section"]');

    if (!contactSection || contactNavLinks.length === 0) return;

    contactNavLinks.forEach(function(link){
        link.addEventListener("click", function(e){
            e.preventDefault();
            contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
            history.pushState(null, "", "#contact-section");
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

(function(){

    function looksLikeHtml(text){
        return /<[a-z][a-z0-9]*(\s|>|\/)/i.test(text || "");
    }

    function escapeHtml(text){
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function plainTextToHtml(text){
        return String(text)
            .split(/\n{2,}/)
            .map(block => "<p>" + escapeHtml(block).replace(/\n/g, "<br>") + "</p>")
            .join("");
    }

    function findArea(form, name){
        if(!form){
            return null;
        }

        const wrapper = form.querySelector(`.rte[data-rte-name="${name}"]`);
        return wrapper ? wrapper.querySelector(".rte-area") : null;
    }

    function isAreaEmpty(area){
        if(area.querySelector("img, iframe, table, video")){
            return false;
        }

        return area.textContent.replace(/\u00a0/g, " ").trim() === "";
    }

    function refreshEmptyState(area){
        area.classList.toggle("rte-empty", isAreaEmpty(area));
    }

    function getUploadCsrfHeaders(){
        const headers = {};
        const token = document.querySelector('meta[name="_csrf"]')?.getAttribute("content");
        const headerName = document.querySelector('meta[name="_csrf_header"]')?.getAttribute("content");

        if(token && headerName){
            headers[headerName] = token;
        }

        return headers;
    }

    function findAncestor(node, tagName, boundary){
        let current = node && node.nodeType === Node.TEXT_NODE ? node.parentNode : node;

        while(current && current !== boundary){
            if(current.nodeType === Node.ELEMENT_NODE && current.tagName === tagName){
                return current;
            }
            current = current.parentNode;
        }

        return null;
    }

    function selectionInside(area){
        const selection = window.getSelection();

        if(!selection || selection.rangeCount === 0){
            return false;
        }

        return area.contains(selection.getRangeAt(0).commonAncestorContainer);
    }

    function placeCaretAtEnd(area){
        const range = document.createRange();
        range.selectNodeContents(area);
        range.collapse(false);

        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function toggleInlineCode(area){
        const selection = window.getSelection();

        if(!selection || selection.rangeCount === 0){
            return;
        }

        const existingCode = findAncestor(selection.anchorNode, "CODE", area);

        if(existingCode){
            const parent = existingCode.parentNode;

            while(existingCode.firstChild){
                parent.insertBefore(existingCode.firstChild, existingCode);
            }

            parent.removeChild(existingCode);
            parent.normalize();
            return;
        }

        if(selection.isCollapsed){
            return;
        }

        const range = selection.getRangeAt(0);
        const code = document.createElement("code");

        try{
            range.surroundContents(code);
        }catch(e){
            code.appendChild(range.extractContents());
            range.insertNode(code);
        }

        selection.removeAllRanges();
        const after = document.createRange();
        after.selectNodeContents(code);
        selection.addRange(after);
    }

    function toggleBlock(tag){
        const current = (document.queryCommandValue("formatBlock") || "").toLowerCase();
        document.execCommand("formatBlock", false, current === tag ? "p" : tag);
    }

    function hardenLinks(area){
        area.querySelectorAll("a").forEach(anchor => {
            anchor.setAttribute("target", "_blank");
            anchor.setAttribute("rel", "noopener noreferrer");
        });
    }

    function insertLink(area){
        const selection = window.getSelection();
        const existing = selection && selection.rangeCount > 0
            ? findAncestor(selection.anchorNode, "A", area)
            : null;

        const currentHref = existing ? existing.getAttribute("href") : "";
        const url = prompt("Link URL (leave empty to remove the link):", currentHref || "https://");

        if(url === null){
            return;
        }

        const trimmed = url.trim();

        if(trimmed === "" || trimmed === "https://"){
            if(existing){
                document.execCommand("unlink");
            }
            return;
        }

        if(existing){
            existing.setAttribute("href", trimmed);
        }else if(selection && !selection.isCollapsed){
            document.execCommand("createLink", false, trimmed);
        }else{
            document.execCommand(
                "insertHTML",
                false,
                `<a href="${escapeHtml(trimmed)}">${escapeHtml(trimmed)}</a>`
            );
        }

        hardenLinks(area);
    }

    function buildVideoEmbed(rawUrl){
        const url = rawUrl.trim();

        const youtubeMatch = url.match(
            /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
        );

        if(youtubeMatch){
            const src = `https://www.youtube-nocookie.com/embed/${youtubeMatch[1]}`;
            return `<div class="video-embed"><iframe src="${src}" title="Embedded video" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div><p><br></p>`;
        }

        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

        if(vimeoMatch){
            const src = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            return `<div class="video-embed"><iframe src="${src}" title="Embedded video" frameborder="0" allowfullscreen loading="lazy"></iframe></div><p><br></p>`;
        }

        // Direct video file links
        if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(url) && /^https?:\/\//i.test(url)){
            return `<video class="post-video" controls preload="metadata" src="${escapeHtml(url)}"></video><p><br></p>`;
        }

        return null;
    }

    function insertVideo(){
        const url = prompt("Video URL (YouTube, Vimeo, or a direct .mp4 link):", "https://");

        if(url === null || url.trim() === "" || url.trim() === "https://"){
            return;
        }

        const embed = buildVideoEmbed(url);

        if(!embed){
            alert("That URL was not recognized. Use a YouTube/Vimeo link or a direct .mp4/.webm file link.");
            return;
        }

        document.execCommand("insertHTML", false, embed);
    }

    function insertTable(){
        const rowsRaw = prompt("Number of rows (including header):", "3");

        if(rowsRaw === null){
            return;
        }

        const colsRaw = prompt("Number of columns:", "3");

        if(colsRaw === null){
            return;
        }

        const rows = Math.min(Math.max(parseInt(rowsRaw, 10) || 3, 2), 12);
        const cols = Math.min(Math.max(parseInt(colsRaw, 10) || 3, 1), 8);

        let html = "<table><thead><tr>";

        for(let c = 0; c < cols; c++){
            html += `<th>Header ${c + 1}</th>`;
        }

        html += "</tr></thead><tbody>";

        for(let r = 0; r < rows - 1; r++){
            html += "<tr>";
            for(let c = 0; c < cols; c++){
                html += "<td><br></td>";
            }
            html += "</tr>";
        }

        html += "</tbody></table><p><br></p>";

        document.execCommand("insertHTML", false, html);
    }

    async function shrinkImageFile(file){
        try{
            if(!file || !file.type || !file.type.startsWith("image/")){
                return file;
            }

            if(file.type === "image/gif"){
                return file;
            }

            const MAX_SIDE = 1600;
            const SIZE_LIMIT = 900 * 1024;

            let bitmap;
            try{
                bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
            }catch(e){
                bitmap = await createImageBitmap(file);
            }

            const maxSide = Math.max(bitmap.width, bitmap.height);

            if(maxSide <= MAX_SIDE && file.size <= SIZE_LIMIT){
                bitmap.close();
                return file;
            }

            const scale = Math.min(1, MAX_SIDE / maxSide);
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            const keepPng = file.type === "image/png";

            if(!keepPng){
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
            }

            ctx.drawImage(bitmap, 0, 0, width, height);
            bitmap.close();

            const outType = keepPng ? "image/png" : "image/jpeg";
            const blob = await new Promise(resolve => canvas.toBlob(resolve, outType, 0.85));

            if(!blob || blob.size >= file.size){
                return file;
            }

            const newName = (file.name || "image").replace(/\.[^.]+$/, "") + (keepPng ? ".png" : ".jpg");
            return new File([blob], newName, { type: outType });
        }catch(e){
            return file;
        }
    }

    async function uploadAndInsertImage(area, fileInput, button){
        const file = fileInput.files && fileInput.files[0];

        if(!file){
            return;
        }

        const icon = button ? button.querySelector("i") : null;
        const originalIconClass = icon ? icon.className : null;

        if(button){
            button.disabled = true;
        }

        if(icon){
            icon.className = "fa-solid fa-spinner fa-spin";
        }

        try{
            const uploadFile = await shrinkImageFile(file);

            const uploadData = new FormData();
            uploadData.append("image", uploadFile, uploadFile.name || "image");

            const response = await fetch("/api/blog/upload-image", {
                method: "POST",
                headers: getUploadCsrfHeaders(),
                body: uploadData
            });

            if(!response.ok){
                console.error("Failed to upload inline image:", response.status);
                alert("Image upload failed (" + response.status + "). The file may be too large.");
                return;
            }

            const json = await response.json();

            if(json && json.imageUrl){
                area.focus();

                if(!selectionInside(area)){
                    placeCaretAtEnd(area);
                }

                document.execCommand(
                    "insertHTML",
                    false,
                    `<img src="${escapeHtml(json.imageUrl)}" alt="${escapeHtml(file.name.replace(/\.[^.]+$/, ""))}" loading="lazy"><p><br></p>`
                );
            }
        }catch(error){
            console.error("Error uploading inline image:", error);
            alert("Image upload failed. Check your connection and try again.");
        }finally{
            fileInput.value = "";

            if(button){
                button.disabled = false;
            }

            if(icon && originalIconClass){
                icon.className = originalIconClass;
            }

            refreshEmptyState(area);
        }
    }

    function syncToolbarState(wrapper, area){
        const buttons = wrapper.querySelectorAll(".rte-btn");
        const inArea = document.activeElement === area || selectionInside(area);

        buttons.forEach(button => {
            const cmd = button.dataset.cmd;
            let active = false;

            if(inArea){
                try{
                    if(["bold", "italic", "strikeThrough", "insertUnorderedList", "insertOrderedList"].includes(cmd)){
                        active = document.queryCommandState(cmd);
                    }else if(cmd === "h2" || cmd === "h3"){
                        active = (document.queryCommandValue("formatBlock") || "").toLowerCase() === cmd;
                    }else if(cmd === "inlineCode"){
                        const selection = window.getSelection();
                        active = !!(selection && selection.rangeCount > 0
                            && findAncestor(selection.anchorNode, "CODE", area));
                    }else if(cmd === "link"){
                        const selection = window.getSelection();
                        active = !!(selection && selection.rangeCount > 0
                            && findAncestor(selection.anchorNode, "A", area));
                    }
                }catch(e){
                    active = false;
                }
            }

            button.classList.toggle("active", active);
        });
    }

    function initEditor(wrapper){
        const toolbar = wrapper.querySelector(".rte-toolbar");
        const area = wrapper.querySelector(".rte-area");
        const fileInput = wrapper.querySelector(".rte-image-input");

        if(!toolbar || !area){
            return;
        }

        toolbar.addEventListener("mousedown", function(e){
            e.preventDefault();
        });

        toolbar.addEventListener("click", function(e){
            const button = e.target.closest(".rte-btn");

            if(!button || button.disabled){
                return;
            }

            const cmd = button.dataset.cmd;

            area.focus();

            if(!selectionInside(area)){
                placeCaretAtEnd(area);
            }

            switch(cmd){
                case "bold":
                case "italic":
                case "strikeThrough":
                case "insertUnorderedList":
                case "insertOrderedList":
                    document.execCommand(cmd);
                    break;
                case "h2":
                case "h3":
                    toggleBlock(cmd);
                    break;
                case "inlineCode":
                    toggleInlineCode(area);
                    break;
                case "link":
                    insertLink(area);
                    break;
                case "image":
                    if(fileInput){
                        fileInput.click();
                    }
                    break;
                case "video":
                    insertVideo();
                    break;
                case "table":
                    insertTable();
                    break;
                case "clear":
                    document.execCommand("removeFormat");
                    document.execCommand("unlink");
                    document.execCommand("formatBlock", false, "p");
                    break;
            }

            refreshEmptyState(area);
            syncToolbarState(wrapper, area);
        });

        if(fileInput){
            fileInput.addEventListener("change", function(){
                const imageButton = toolbar.querySelector('.rte-btn[data-cmd="image"]');
                uploadAndInsertImage(area, fileInput, imageButton);
            });
        }

        area.addEventListener("paste", function(e){
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text/plain");
            document.execCommand("insertText", false, text);
        });

        area.addEventListener("input", function(){
            refreshEmptyState(area);
        });

        area.addEventListener("blur", function(){
            hardenLinks(area);
        });

        document.addEventListener("selectionchange", function(){
            if(document.activeElement === area){
                syncToolbarState(wrapper, area);
            }
        });

        refreshEmptyState(area);
    }

    const editorWrappers = document.querySelectorAll(".rte");

    if(editorWrappers.length > 0){
        try{
            document.execCommand("styleWithCSS", false, false);
            document.execCommand("defaultParagraphSeparator", false, "p");
        }catch(e){}

        editorWrappers.forEach(initEditor);
    }

    window.KarimRTE = {
        looksLikeHtml: looksLikeHtml,
        shrinkImage: shrinkImageFile,

        get: function(form, name){
            const area = findArea(form, name);

            if(!area){
                const fallback = form ? form.querySelector(`[name="${name}"]`) : null;
                return fallback ? fallback.value : "";
            }

            if(isAreaEmpty(area)){
                return "";
            }

            hardenLinks(area);
            return area.innerHTML.trim();
        },

        set: function(form, name, stored){
            const area = findArea(form, name);

            if(!area){
                const fallback = form ? form.querySelector(`[name="${name}"]`) : null;
                if(fallback){
                    fallback.value = stored || "";
                }
                return;
            }

            if(!stored){
                area.innerHTML = "";
            }else if(looksLikeHtml(stored)){
                area.innerHTML = stored;
            }else{
                area.innerHTML = plainTextToHtml(stored);
            }

            refreshEmptyState(area);
        },

        clear: function(form){
            if(!form){
                return;
            }

            form.querySelectorAll(".rte-area").forEach(area => {
                area.innerHTML = "";
                refreshEmptyState(area);
            });
        }
    };
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
        image.loading = "lazy";
        try{ image.decoding = "async"; }catch(e){}
        image.alt = post.title ? `Image for ${post.title}` : "Blog post image";

        // Normalize image URLs so relative paths resolve from site root
        function normalizeImageUrl(url){
            if(!url) return url;
            if(url.startsWith('http') || url.startsWith('/')) return url;
            return '/' + url.replace(/^\/+/, '');
        }

        // Keep the no-image display for posts that do not have an image,
        // and fall back to it if the provided image URL fails to load.
        if(post.imageUrl){
            image.src = normalizeImageUrl(post.imageUrl);
        }else{
            image.src = "/images/no-image.png";
            image.classList.add("blog-card-image--fallback");
        }

        image.addEventListener('error', function(){
            if(image.src && !image.dataset.fallback){
                image.dataset.fallback = '1';
                // hide the img element and use the wrapper background so the filler covers the whole area
                try{
                    image.style.display = 'none';
                    imageWrap.style.backgroundImage = "url('/images/no-image.png')";
                    imageWrap.style.backgroundSize = 'cover';
                    imageWrap.style.backgroundPosition = 'center';
                }catch(e){
                    // fallback to replacing src if setting background fails
                    image.src = '/images/no-image.png';
                    image.classList.add('blog-card-image--fallback');
                }
            }
        });

        imageWrap.appendChild(image);

        const body = document.createElement("div");
        body.className = "blog-card-body";

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

        const divider = document.createElement("hr");
        divider.className = "blog-card-divider";

        const summary = document.createElement("div");
        summary.className = "blog-card-summary";

        if(post.summary && window.KarimRTE && window.KarimRTE.looksLikeHtml(post.summary)){
            summary.innerHTML = post.summary;
        }else{
            summary.textContent = post.summary || "No summary available.";
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

        body.appendChild(title);
        body.appendChild(date);
        body.appendChild(divider);
        body.appendChild(summary);
        body.appendChild(actions);

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
            const uploadFile = window.KarimRTE && window.KarimRTE.shrinkImage
                ? await window.KarimRTE.shrinkImage(fileInput.files[0])
                : fileInput.files[0];

            const uploadData = new FormData();
            uploadData.append('image', uploadFile, uploadFile.name || 'image');

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

                    if(blogFormMessage){
                        blogFormMessage.textContent =
                            `Card image upload failed (${uploadResponse.status}). ` +
                            `Post was NOT published. Try a smaller image or re-log in.`;
                    }

                    return;
                }

                const json = await uploadResponse.json();
                if(json && json.imageUrl){
                    imageUrl = json.imageUrl;
                    const hidden = blogForm.querySelector('input[name="imageUrl"]');
                    if(hidden) hidden.value = imageUrl;
                }
            }catch(e){
                console.error('Error uploading image:', e);

                if(blogFormMessage){
                    blogFormMessage.textContent = "Card image upload failed. Post was NOT published.";
                }

                return;
            }
        }

        const summaryHtml = window.KarimRTE
            ? window.KarimRTE.get(blogForm, "summary")
            : (formData.get("summary") || "");

        const contentHtml = window.KarimRTE
            ? window.KarimRTE.get(blogForm, "content")
            : (formData.get("content") || "");

        if(!contentHtml){
            if(blogFormMessage){
                blogFormMessage.textContent = "Content is required.";
            }
            return;
        }

        const payload = {
            title: formData.get("title"),
            url: formData.get("url"),
            imageUrl: imageUrl,
            summary: summaryHtml,
            content: contentHtml
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
                    blogFormMessage.textContent = response.status === 409
                        ? "That URL slug is already used by another post."
                        : `Could not publish post (error ${response.status}). Please try again.`;
                }

                return;
            }

            const createdPost = await response.json();

            addBlogPostCard(createdPost, true);
            blogForm.reset();

            if(window.KarimRTE){
                window.KarimRTE.clear(blogForm);
            }

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

    const editButton = document.getElementById("set-dropdown");
    const editModal = document.getElementById("dropdown");
    const editForm = document.getElementById("blogPostForm");
    const editFormMessage = document.getElementById("blogFormMessage");
    const editCancelBottom = document.getElementById("blogCancelBottom");

    const pathParts = window.location.pathname.split("/").filter(Boolean);
    let slug = pathParts[pathParts.length - 1];

    let currentPost = null;

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

    function closeEditModal(){
        if(editModal){
            editModal.classList.remove("show");
            editModal.setAttribute("aria-hidden", "true");
        }
    }

    function populateEditForm(){
        if(!editForm || !currentPost){
            return;
        }

        const titleInput = editForm.querySelector('input[name="title"]');
        const urlInput = editForm.querySelector('input[name="url"]');
        const imageUrlHidden = editForm.querySelector('input[name="imageUrl"]');
        const fileInput = editForm.querySelector('input[name="imageFile"]');

        if(titleInput) titleInput.value = currentPost.title || "";
        if(urlInput) urlInput.value = currentPost.url || "";

        if(window.KarimRTE){
            window.KarimRTE.set(editForm, "summary", currentPost.summary || "");
            window.KarimRTE.set(editForm, "content", currentPost.content || "");
        }

        if(imageUrlHidden) imageUrlHidden.value = currentPost.imageUrl || "";
        if(fileInput) fileInput.value = "";

        if(editFormMessage){
            editFormMessage.textContent = "";
        }
    }

    async function submitEdit(event){
        event.preventDefault();

        if(!editForm || !currentPost){
            return;
        }

        const formData = new FormData(editForm);

        const fileInput = editForm.querySelector('input[name="imageFile"]');
        let imageUrl = formData.get("imageUrl");

        if(fileInput && fileInput.files && fileInput.files.length > 0){
            const uploadFile = window.KarimRTE && window.KarimRTE.shrinkImage
                ? await window.KarimRTE.shrinkImage(fileInput.files[0])
                : fileInput.files[0];

            const uploadData = new FormData();
            uploadData.append('image', uploadFile, uploadFile.name || 'image');

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

                    if(editFormMessage){
                        editFormMessage.textContent =
                            `Card image upload failed (${uploadResponse.status}). Changes were NOT saved.`;
                    }

                    return;
                }

                const json = await uploadResponse.json();
                if(json && json.imageUrl){
                    imageUrl = json.imageUrl;

                    const hidden = editForm.querySelector('input[name="imageUrl"]');
                    if(hidden) hidden.value = imageUrl;
                }
            }catch(e){
                console.error('Error uploading image:', e);

                if(editFormMessage){
                    editFormMessage.textContent = "Card image upload failed. Changes were NOT saved.";
                }

                return;
            }
        }

        const summaryHtml = window.KarimRTE
            ? window.KarimRTE.get(editForm, "summary")
            : (formData.get("summary") || "");

        const contentHtml = window.KarimRTE
            ? window.KarimRTE.get(editForm, "content")
            : (formData.get("content") || "");

        if(!contentHtml){
            if(editFormMessage){
                editFormMessage.textContent = "Content is required.";
            }
            return;
        }

        const payload = {
            title: formData.get("title"),
            url: formData.get("url"),
            imageUrl: imageUrl,
            summary: summaryHtml,
            content: contentHtml
        };

        try{
            const response = await fetch(`/api/blog/posts/${currentPost.id}`, {
                method: "PUT",
                headers: getCsrfHeaders(),
                body: JSON.stringify(payload)
            });

            if(!response.ok){
                console.error("Failed to update blog post:", response.status);

                if(editFormMessage){
                    editFormMessage.textContent = response.status === 409
                        ? "That URL slug is already used by another post."
                        : `Could not save changes (error ${response.status}). Please try again.`;
                }

                return;
            }

            const updatedPost = await response.json();

            currentPost = updatedPost;
            renderBlogPostDetail(updatedPost);

            if(updatedPost.url && updatedPost.url !== slug){
                slug = updatedPost.url;
                history.replaceState(null, "", `/blog/${encodeURIComponent(updatedPost.url)}`);
            }

            if(editFormMessage){
                editFormMessage.textContent = "Changes saved!";
            }

            closeEditModal();

        }catch(error){
            console.error("Error updating blog post:", error);

            if(editFormMessage){
                editFormMessage.textContent = "Error saving changes.";
            }
        }
    }

    if(editButton){
        editButton.addEventListener("click", populateEditForm);
    }

    if(editCancelBottom){
        editCancelBottom.addEventListener("click", function(e){
            e.preventDefault();
            closeEditModal();
        });
    }

    if(editModal){
        editModal.addEventListener("click", function(e){
            if(e.target === editModal){
                closeEditModal();
            }
        });
    }

    if(editForm){
        editForm.addEventListener("submit", submitEdit);
    }

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

            currentPost = post;
            renderBlogPostDetail(post);

            if(editButton){
                editButton.style.display = "inline-flex";
            }

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

        const image = document.createElement("img");
        image.className = "blog-detail-image";
        function normalizeImageUrl(url){
            if(!url) return url;
            if(url.startsWith('http') || url.startsWith('/')) return url;
            return '/' + url.replace(/^\/+/, '');
        }

        if(post.imageUrl){
            image.src = normalizeImageUrl(post.imageUrl);
        }else{
            image.src = '/images/no-image.png';
            image.classList.add('blog-detail-image--fallback');
        }

        image.alt = post.title ? `Image for ${post.title}` : "Blog post image";
        image.loading = 'lazy';
        try{ image.decoding = 'async'; }catch(e){}
        image.addEventListener('error', function(){
            if(image.src && !image.dataset.fallback){
                image.dataset.fallback = '1';
                image.src = '/images/no-image.png';
                image.classList.add('blog-detail-image--fallback');
            }
        });

        detailContainer.appendChild(image);

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

        const summary = document.createElement("div");
        summary.className = "blog-detail-summary";
        const infoIcon = document.createElement("i");
        infoIcon.className = "fa-solid fa-circle-info";
        summary.appendChild(infoIcon);

        const summaryBody = document.createElement("span");
        summaryBody.className = "blog-detail-summary-body";

        if(post.summary && window.KarimRTE && window.KarimRTE.looksLikeHtml(post.summary)){
            summaryBody.innerHTML = post.summary;
        }else{
            summaryBody.textContent = post.summary || "";
        }

        summary.appendChild(summaryBody);

        const content = document.createElement("div");
        content.className = "blog-detail-content";

        if(post.content && window.KarimRTE && window.KarimRTE.looksLikeHtml(post.content)){
            content.classList.add("blog-detail-content--rich");
            content.innerHTML = post.content;
        }else{
            content.textContent = post.content || "";
        }

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