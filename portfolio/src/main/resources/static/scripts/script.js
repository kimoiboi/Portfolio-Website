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