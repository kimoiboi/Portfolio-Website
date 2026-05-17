/* Adjusted the way it scrolls down when clicking on email icon at bottom of page (Help a littlew ith AI) */
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