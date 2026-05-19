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

// GitHub API Integration with Persistence
(function(){
    const dropdown = document.getElementById("dropdown");
    const projectsContainer = document.querySelector(".recent-project-box");
    const STORAGE_KEY = "portfolioSelectedRepos";

    // Guests do not have the dropdown, but they still have the project container.
    // So only stop if the project container is missing.
    if(!projectsContainer){
        return;
    }

    let allRepos = [];

    // Perform the Fetch to get GitHub Repositories
    async function fetchGitHubRepos(){
        try{
            const response = await fetch("/api/github/repos");

            if(!response.ok){
                console.error("Failed to fetch GitHub repositories: ", response.status);
                return [];
            }

            const repos = await response.json();
            return repos;
        } catch(error){
            console.error("Error fetching GitHub repositories: ", error);
            return [];
        }
    }

    // Populate Dropdown with Repository Names at my GitHub
    function populateDropdown(repos){
        // Guests do not have the admin dropdown, so skip this part for guests.
        if(!dropdown){
            return;
        }

        const dropdownList = dropdown.querySelector("ul");

        if(!dropdownList){
            return;
        }

        dropdownList.innerHTML = "";

        if(repos.length == 0){
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
            delBtn.innerHTML = '<i class ="fa-solid fa-trash-can"></i>';
            delBtn.dataset.repoIndex = index;

            // Handles the Delete Event for the Dropdown Trash Icon
            delBtn.addEventListener("click", function(e){
                e.stopPropagation();
                e.preventDefault();

                const idx = parseInt(this.dataset.repoIndex);
                const selectedRepo = repos[idx];

                if(!selectedRepo){
                    return;
                }

                const existingCard = projectsContainer.querySelector(`[data-repo-name="${selectedRepo.name}"]`);

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

    // Creating the Project "Card" Element
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

        card.innerHTML = `
            <div class="repo-card-descr-box">
                <label class="project-select">
                  <input type="checkbox" />
                </label>
                <p class="repo-card-title">${repo.name}</p>
                <p class="repo-card-descr">${description}</p>
                <div class="repo-card-links">
                    <div class="repo-updated">Last updated: ${formattedDate}</div>
                    ${repo.htmlUrl ? `
                    <div>
                        <a class="link" href="${repo.htmlUrl}" target="_blank" rel="noopener noreferrer">
                            <i class='fas fa-paperclip' style="font-size: 17.6px; color: white; align-items: center;"></i>View
                        </a>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        return card;
    }

    // Save Repositories that are Chosen in localStorage
    function saveSelectedRepos(){
        const selectedCards = projectsContainer.querySelectorAll(".repo-card");
        const repoNames = Array.from(selectedCards).map(card => card.dataset.repoName);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(repoNames));
    }

    // Load Repositories that are in localStorage
    function loadSelectedRepos(){
        try{
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch(error){
            console.error("Error loading saved repos: ", error);
            return [];
        }
    }

    // Remove a Card using Animation CSS-Styling
    function removeCard(card){
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.95)";

        setTimeout(() => {
            card.remove();
            saveSelectedRepos();
        }, 300);
    }

    // Adds a Project Card to the Container
    function addProjectCard(repo, animate = true){
        const existingCard = projectsContainer.querySelector(`[data-repo-name="${repo.name}"]`);

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

        saveSelectedRepos();
    }

    // Restore Saved Cards on Page Load
    function restoreSavedCards(){
        const savedRepoNames = loadSelectedRepos();

        projectsContainer.innerHTML = "";

        if(savedRepoNames.length === 0){
            return;
        }

        savedRepoNames.forEach(repoName =>{
            const repo = allRepos.find(r => r.name === repoName);

            if(repo){
                addProjectCard(repo, false);
            }
        });
    }

    // Handle dropdown item clicks
    function handleRepoSelection(repos){
        // Guests do not have the admin dropdown, so skip this part for guests.
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
                const existingCard = projectsContainer.querySelector(`[data-repo-name="${selectedRepo.name}"]`);

                if(existingCard){
                    existingCard.style.transition = "transform 0.2s ease";
                    existingCard.style.transform = "scale(1.05)";

                    setTimeout(() => {
                        existingCard.style.transform = "scale(1)";
                    }, 200);
                }else{
                    addProjectCard(selectedRepo, true);
                }

                dropdown.classList.remove("show");
                dropdown.setAttribute("aria-hidden", "true");
            }
        });
    }

    // Initialization of Everything
    async function init() {
        const repos = await fetchGitHubRepos();
        allRepos = repos;

        if(repos.length > 0){
            restoreSavedCards();
            populateDropdown(repos);
            handleRepoSelection(repos);
        }
    }

    init();
})();