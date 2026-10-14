/* =========================================================
   INTERNBOARD - FINAL SCRIPT
   Internship Opportunities Board
========================================================= */



/* =========================================================
   INTERNSHIP DATA - LOADED FROM BACKEND API
========================================================= */

const API_BASE = "http://localhost:5000/api";

let internships = [];
let internshipsLoading = true;

async function loadInternships() {
    internshipsLoading = true;

    if (internshipGrid) {
        internshipGrid.innerHTML =
            "<p>Loading internships...</p>";
    }

    try {
        const response = await fetch(`${API_BASE}/internships`);

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Failed to load internships."
            );
        }

        const records = Array.isArray(result.data)
            ? result.data
            : [];

        internships = records.map((item) => ({
            ...item,
            id: String(item.id),
            company: item.company || item.company_name || "InternBoard",
            stipend: item.stipend
                ? String(item.stipend)
                : "Not specified",
            stipendValue: Number(item.stipendValue || 0),
            duration: item.duration || "Not specified",
            deadline: item.deadline || "Check details",
            openings: Number(item.openings || 0),
            skills: Array.isArray(item.skills) ? item.skills : [],
            featured: Boolean(item.featured),
            description: item.description || "No description available."
        }));

        renderInternships();

    } catch (error) {
        console.error("Loading internships failed:", error);

        if (internshipGrid) {
            internshipGrid.innerHTML =
                "<p>Unable to load internships. Check that the backend server is running and try again.</p>";
        }

        if (resultsCount) {
            resultsCount.textContent = "Unable to load opportunities";
        }

    } finally {
        internshipsLoading = false;
    }
}


/* =========================================================
   DOM ELEMENTS
========================================================= */

const filterForm = document.getElementById("filterForm");

const searchInput = document.getElementById("searchInput");
const domainFilter = document.getElementById("domainFilter");
const modeFilter = document.getElementById("modeFilter");

const resetBtn = document.getElementById("resetBtn");
const emptyResetBtn = document.getElementById("emptyResetBtn");

const internshipGrid = document.getElementById("internshipGrid");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");


/* =========================================================
   DETAILS MODAL
========================================================= */

const detailsModal = document.getElementById("detailsModal");
const detailsContent = document.getElementById("detailsContent");
const detailsCloseBtn = document.getElementById("detailsCloseBtn");


/* =========================================================
   APPLY MODAL
========================================================= */

const applyModal = document.getElementById("applyModal");
const applyCloseBtn = document.getElementById("applyCloseBtn");
const applyCloseBtnSecondary =
    document.getElementById("applyCloseBtnSecondary");

const applicationForm =
    document.getElementById("applicationForm");

const applyRole =
    document.getElementById("applyRole");

const applicantName =
    document.getElementById("applicantName");

const applicantEmail =
    document.getElementById("applicantEmail");

const portfolioUrl =
    document.getElementById("portfolioUrl");

const coverMessage =
    document.getElementById("coverMessage");

const nameError =
    document.getElementById("nameError");

const emailError =
    document.getElementById("emailError");

const portfolioError =
    document.getElementById("portfolioError");

const applicationSuccess =
    document.getElementById("applicationSuccess");


/* =========================================================
   APPLICATION STATE
========================================================= */

let selectedInternship = null;

let savedInternships = JSON.parse(
    localStorage.getItem("internboard_saved") || "[]"
);


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

/**
 * Escape HTML to prevent unwanted HTML injection
 */
function escapeHTML(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/**
 * Check whether internship is saved
 */
function isSaved(id) {
    return savedInternships.includes(id);
}


/**
 * Save updated bookmarks
 */
function saveBookmarks() {
    localStorage.setItem(
        "internboard_saved",
        JSON.stringify(savedInternships)
    );
}


/**
 * Get internship by ID
 */
function getInternshipById(id) {
    return internships.find(
        internship => internship.id === id
    );
}


/**
 * Generate company initials
 */
function getCompanyInitials(company) {
    return company
        .split(" ")
        .map(word => word[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();
}


/* =========================================================
   TOGGLE SAVE / BOOKMARK
========================================================= */

function toggleSave(id) {

    if (isSaved(id)) {

        savedInternships =
            savedInternships.filter(
                savedId => savedId !== id
            );

    } else {

        savedInternships.push(id);
    }

    saveBookmarks();

    renderInternships();
}


/* =========================================================
   FILTER INTERNSHIPS
========================================================= */

function getFilteredInternships() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();

    const selectedDomain =
        domainFilter.value;

    const selectedMode =
        modeFilter.value;


    return internships.filter(internship => {

        /* ---------------- SEARCH ---------------- */

        const searchableText = [
            internship.title,
            internship.company,
            internship.domain,
            internship.mode,
            internship.location,
            internship.stipend,
            internship.duration,
            internship.description,
            ...internship.skills
        ]
            .join(" ")
            .toLowerCase();


        const matchesSearch =
            !searchTerm ||
            searchableText.includes(searchTerm);


        /* ---------------- DOMAIN ---------------- */

        const matchesDomain =
            selectedDomain === "all" ||
            internship.domain === selectedDomain;


        /* ---------------- MODE ---------------- */

        const matchesMode =
            selectedMode === "all" ||
            internship.mode === selectedMode;


        return (
            matchesSearch &&
            matchesDomain &&
            matchesMode
        );
    });
}


/* =========================================================
   RENDER INTERNSHIPS
========================================================= */

function renderInternships() {

    const filteredInternships =
        getFilteredInternships();


    internshipGrid.innerHTML = "";


    /* ---------------- RESULTS COUNT ---------------- */

    const count =
        filteredInternships.length;

    resultsCount.textContent =
        `${count} ${count === 1 ? "opportunity" : "opportunities"}`;


    /* ---------------- EMPTY STATE ---------------- */

    if (count === 0) {

        emptyState.hidden = false;
        internshipGrid.hidden = true;

        return;

    }


    emptyState.hidden = true;
    internshipGrid.hidden = false;


    /* ---------------- CARDS ---------------- */

    filteredInternships.forEach(
        internship => {

            const card =
                createInternshipCard(internship);

            internshipGrid.appendChild(card);
        }
    );
}


/* =========================================================
   CREATE INTERNSHIP CARD
========================================================= */

function createInternshipCard(internship) {

    const article =
        document.createElement("article");

    article.className = "internship-card";


    if (internship.featured) {
        article.classList.add("featured-card");
    }


    const saved =
        isSaved(internship.id);


    article.innerHTML = `

        ${
            internship.featured
                ? `
                    <div class="featured-badge">
                        ⭐ Featured
                    </div>
                  `
                : ""
        }


        <div class="card-top">

            <div class="company-info">

                <div class="company-logo">
                    ${escapeHTML(
                        getCompanyInitials(
                            internship.company
                        )
                    )}
                </div>

                <div>

                    <span class="company-name">
                        ${escapeHTML(
                            internship.company
                        )}
                    </span>

                    <span class="location">
                        📍 ${escapeHTML(
                            internship.location
                        )}
                    </span>

                </div>

            </div>


            <button
                type="button"
                class="save-btn ${saved ? "saved" : ""}"
                data-save-id="${escapeHTML(
                    internship.id
                )}"
                aria-label="${
                    saved
                        ? "Remove saved internship"
                        : "Save internship"
                }"
                title="${
                    saved
                        ? "Remove from saved"
                        : "Save internship"
                }"
            >
                ${saved ? "♥" : "♡"}
            </button>

        </div>


        <div class="card-content">

            <span class="domain-tag">
                ${escapeHTML(
                    internship.domain
                )}
            </span>


            <h3 class="internship-title">
                ${escapeHTML(
                    internship.title
                )}
            </h3>


            <div class="job-meta">

                <span>
                    🌐 ${escapeHTML(
                        internship.mode
                    )}
                </span>

                <span>
                    📍 ${escapeHTML(
                        internship.location
                    )}
                </span>

            </div>


            <div class="job-info">

                <div class="job-info-item">

                    <span class="job-info-icon">
                        💰
                    </span>

                    <div>
                        <small>Stipend</small>
                        <strong>
                            ${escapeHTML(
                                internship.stipend
                            )}
                        </strong>
                    </div>

                </div>


                <div class="job-info-item">

                    <span class="job-info-icon">
                        ⏱
                    </span>

                    <div>
                        <small>Duration</small>
                        <strong>
                            ${escapeHTML(
                                internship.duration
                            )}
                        </strong>
                    </div>

                </div>

            </div>


            <div class="skills-list">

                ${internship.skills
                    .map(
                        skill => `
                            <span class="skill-tag">
                                ${escapeHTML(skill)}
                            </span>
                        `
                    )
                    .join("")}

            </div>


            <div class="deadline">

                <span>
                    ⏰ Application Deadline
                </span>

                <strong>
                    ${escapeHTML(
                        internship.deadline
                    )}
                </strong>

            </div>


            <div class="openings-info">

                <span>
                    👥 ${internship.openings}
                    ${
                        internship.openings === 1
                            ? "opening"
                            : "openings"
                    }
                </span>

                <span class="status-dot">
                    ●
                </span>

                <span>
                    Accepting applications
                </span>

            </div>

        </div>


        <div class="card-actions">

            <button
                type="button"
                class="btn btn-outline details-btn"
                data-details-id="${escapeHTML(
                    internship.id
                )}"
            >
                View Details
            </button>


            <button
                type="button"
                class="btn btn-primary apply-btn"
                data-apply-id="${escapeHTML(
                    internship.id
                )}"
            >
                Apply Now
                <span>→</span>
            </button>

        </div>
    `;


    return article;
}


/* =========================================================
   EVENT DELEGATION FOR CARDS
========================================================= */

internshipGrid.addEventListener(
    "click",
    function (event) {

        /* ---------------- SAVE ---------------- */

        const saveButton =
            event.target.closest(
                "[data-save-id]"
            );

        if (saveButton) {

            const id =
                saveButton.dataset.saveId;

            toggleSave(id);

            return;
        }


        /* ---------------- DETAILS ---------------- */

        const detailsButton =
            event.target.closest(
                "[data-details-id]"
            );

        if (detailsButton) {

            const id =
                detailsButton.dataset.detailsId;

            openDetailsModal(id);

            return;
        }


        /* ---------------- APPLY ---------------- */

        const applyButton =
            event.target.closest(
                "[data-apply-id]"
            );

        if (applyButton) {

            const id =
                applyButton.dataset.applyId;

            openApplyModal(id);

            return;
        }
    }
);


/* =========================================================
   DETAILS MODAL
========================================================= */

function openDetailsModal(id) {

    const internship =
        getInternshipById(id);


    if (!internship) {
        return;
    }


    selectedInternship =
        internship;


    detailsContent.innerHTML = `

        <div class="details-header">

            <div class="company-logo details-logo">
                ${escapeHTML(
                    getCompanyInitials(
                        internship.company
                    )
                )}
            </div>

            <div>

                <span class="modal-eyebrow">
                    ${escapeHTML(
                        internship.company
                    )}
                </span>

                <h2 id="detailsModalTitle">
                    ${escapeHTML(
                        internship.title
                    )}
                </h2>

                <p>
                    ${escapeHTML(
                        internship.domain
                    )}
                </p>

            </div>

        </div>


        <div class="details-meta">

            <div class="details-meta-item">

                <span>🌐</span>

                <div>
                    <small>Work Mode</small>
                    <strong>
                        ${escapeHTML(
                            internship.mode
                        )}
                    </strong>
                </div>

            </div>


            <div class="details-meta-item">

                <span>📍</span>

                <div>
                    <small>Location</small>
                    <strong>
                        ${escapeHTML(
                            internship.location
                        )}
                    </strong>
                </div>

            </div>


            <div class="details-meta-item">

                <span>💰</span>

                <div>
                    <small>Stipend</small>
                    <strong>
                        ${escapeHTML(
                            internship.stipend
                        )}
                    </strong>
                </div>

            </div>


            <div class="details-meta-item">

                <span>⏱</span>

                <div>
                    <small>Duration</small>
                    <strong>
                        ${escapeHTML(
                            internship.duration
                        )}
                    </strong>
                </div>

            </div>

        </div>


        <div class="details-section">

            <h3>About the Internship</h3>

            <p>
                ${escapeHTML(
                    internship.description
                )}
            </p>

        </div>


        <div class="details-section">

            <h3>Required Skills</h3>

            <div class="skills-list details-skills">

                ${internship.skills
                    .map(
                        skill => `
                            <span class="skill-tag">
                                ${escapeHTML(skill)}
                            </span>
                        `
                    )
                    .join("")}

            </div>

        </div>


        <div class="details-section deadline-section">

            <div>

                <span>
                    Application Deadline
                </span>

                <strong>
                    ${escapeHTML(
                        internship.deadline
                    )}
                </strong>

            </div>


            <div>

                <span>
                    Available Openings
                </span>

                <strong>
                    ${internship.openings}
                </strong>

            </div>

        </div>


        <div class="details-actions">

            <button
                type="button"
                class="btn btn-primary details-apply-btn"
                data-details-apply="${escapeHTML(
                    internship.id
                )}"
            >
                Apply for this Internship
                <span>→</span>
            </button>

        </div>
    `;


    detailsModal.classList.add("active");

    detailsModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );
}


/* =========================================================
   DETAILS MODAL APPLY BUTTON
========================================================= */

detailsContent.addEventListener(
    "click",
    function (event) {

        const applyButton =
            event.target.closest(
                "[data-details-apply]"
            );


        if (!applyButton) {
            return;
        }


        const id =
            applyButton.dataset.detailsApply;


        closeDetailsModal();

        openApplyModal(id);
    }
);


/* =========================================================
   CLOSE DETAILS MODAL
========================================================= */

function closeDetailsModal() {

    detailsModal.classList.remove(
        "active"
    );

    detailsModal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (
        !applyModal.classList.contains(
            "active"
        )
    ) {
        document.body.classList.remove(
            "modal-open"
        );
    }
}


if (detailsCloseBtn) {

    detailsCloseBtn.addEventListener(
        "click",
        closeDetailsModal
    );
}


/* =========================================================
   APPLY MODAL
========================================================= */

function openApplyModal(id) {

    const internship =
        getInternshipById(id);


    if (!internship) {
        return;
    }


    selectedInternship =
        internship;


    applyRole.textContent =
        internship.title;


    clearValidation();


    applicationSuccess.hidden = true;


    applicationForm.reset();


    applicationSuccess.hidden = true;


    applyModal.classList.add(
        "active"
    );


    applyModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.classList.add(
        "modal-open"
    );


    setTimeout(() => {

        if (applicantName) {
            applicantName.focus();
        }

    }, 100);
}


/* =========================================================
   CLOSE APPLY MODAL
========================================================= */

function closeApplyModal() {

    applyModal.classList.remove(
        "active"
    );

    applyModal.setAttribute(
        "aria-hidden",
        "true"
    );


    if (
        !detailsModal.classList.contains(
            "active"
        )
    ) {
        document.body.classList.remove(
            "modal-open"
        );
    }
}


if (applyCloseBtn) {

    applyCloseBtn.addEventListener(
        "click",
        closeApplyModal
    );
}


if (applyCloseBtnSecondary) {

    applyCloseBtnSecondary.addEventListener(
        "click",
        closeApplyModal
    );
}


/* =========================================================
   MODAL OVERLAY CLICK
========================================================= */

document.querySelectorAll(
    ".modal-overlay"
).forEach(overlay => {

    overlay.addEventListener(
        "click",
        function () {

            const modal =
                overlay.closest(".modal");


            if (!modal) {
                return;
            }


            if (
                modal.id ===
                "detailsModal"
            ) {
                closeDetailsModal();
            }


            if (
                modal.id ===
                "applyModal"
            ) {
                closeApplyModal();
            }
        }
    );
});


/* =========================================================
   FORM VALIDATION
========================================================= */

function clearValidation() {

    if (nameError) {
        nameError.textContent = "";
    }

    if (emailError) {
        emailError.textContent = "";
    }

    if (portfolioError) {
        portfolioError.textContent = "";
    }


    [
        applicantName,
        applicantEmail,
        portfolioUrl
    ].forEach(input => {

        if (input) {
            input.classList.remove(
                "input-error"
            );
        }

    });
}


/* =========================================================
   VALIDATE APPLICATION FORM
========================================================= */

function validateApplication() {

    clearValidation();


    let valid = true;


    /* ---------------- NAME ---------------- */

    const name =
        applicantName.value.trim();


    if (name.length < 2) {

        nameError.textContent =
            "Please enter your full name.";

        applicantName.classList.add(
            "input-error"
        );

        valid = false;
    }


    /* ---------------- EMAIL ---------------- */

    const email =
        applicantEmail.value.trim();


    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailPattern.test(email)) {

        emailError.textContent =
            "Please enter a valid email address.";

        applicantEmail.classList.add(
            "input-error"
        );

        valid = false;
    }


    /* ---------------- PORTFOLIO ---------------- */

    const portfolio =
        portfolioUrl.value.trim();


    if (portfolio) {

        try {

            const url =
                new URL(portfolio);


            if (
                url.protocol !== "http:" &&
                url.protocol !== "https:"
            ) {
                throw new Error();
            }

        } catch (error) {

            portfolioError.textContent =
                "Please enter a valid URL.";

            portfolioUrl.classList.add(
                "input-error"
            );

            valid = false;
        }
    }


    return valid;
}



/* =========================================================
   APPLICATION SUBMIT - BACKEND API
========================================================= */

if (applicationForm) {
    applicationForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!validateApplication()) {
            return;
        }

        if (!selectedInternship) {
            return;
        }

        const submitButton = applicationForm.querySelector(
            'button[type="submit"]'
        );

        const originalButtonHTML = submitButton
            ? submitButton.innerHTML
            : "Submit Application";

        const application = {
            applicant_name: applicantName.value.trim(),
            applicant_email: applicantEmail.value.trim(),
            portfolio_url: portfolioUrl.value.trim(),
            cover_message: coverMessage.value.trim()
        };

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Submitting...";
            }

            const response = await fetch(
              `${API_BASE}/internships/${encodeURIComponent(selectedInternship.id)}/applications`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(application)
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    result.errors?.join(", ") ||
                    "Unable to submit application."
                );
            }

            // Successful response from backend
            applicationSuccess.textContent =
                "Application submitted successfully!";

            applicationSuccess.hidden = false;

            applicationForm.querySelectorAll(
                "input, textarea"
            ).forEach(element => {
                element.disabled = true;
            });

            if (submitButton) {
                submitButton.textContent = "Application Submitted ✓";
            }

            setTimeout(() => {
                closeApplyModal();
                applicationForm.reset();
                clearValidation();

                applicationSuccess.hidden = true;

                applicationForm.querySelectorAll(
                    "input, textarea"
                ).forEach(element => {
                    element.disabled = false;
                });

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonHTML;
                }
            }, 2500);

        } catch (error) {
            console.error("Application submission error:", error);

            applicationSuccess.textContent =
                error.message === "Failed to fetch"
                    ? "Cannot connect to the server. Please ensure the backend is running."
                    : error.message;

            applicationSuccess.hidden = false;

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
            }
        }
    });
}


/* =========================================================
   LIVE VALIDATION CLEANUP
========================================================= */

[
    applicantName,
    applicantEmail,
    portfolioUrl
].forEach(input => {

    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        function () {

            input.classList.remove(
                "input-error"
            );


            if (
                input === applicantName &&
                nameError
            ) {
                nameError.textContent = "";
            }


            if (
                input === applicantEmail &&
                emailError
            ) {
                emailError.textContent = "";
            }


            if (
                input === portfolioUrl &&
                portfolioError
            ) {
                portfolioError.textContent = "";
            }
        }
    );
});


/* =========================================================
   SEARCH + FILTER EVENTS
========================================================= */

if (searchInput) {

    searchInput.addEventListener(
        "input",
        renderInternships
    );
}


if (domainFilter) {

    domainFilter.addEventListener(
        "change",
        renderInternships
    );
}


if (modeFilter) {

    modeFilter.addEventListener(
        "change",
        renderInternships
    );
}


/* =========================================================
   RESET FILTERS
========================================================= */

function resetFilters() {

    searchInput.value = "";

    domainFilter.value = "all";

    modeFilter.value = "all";

    renderInternships();
}


if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        resetFilters
    );
}


if (emptyResetBtn) {

    emptyResetBtn.addEventListener(
        "click",
        resetFilters
    );
}


/* =========================================================
   FILTER FORM SUBMIT
========================================================= */

if (filterForm) {

    filterForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            renderInternships();
        }
    );
}


/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (event.key !== "Escape") {
            return;
        }


        if (
            detailsModal &&
            detailsModal.classList.contains(
                "active"
            )
        ) {
            closeDetailsModal();
        }


        if (
            applyModal &&
            applyModal.classList.contains(
                "active"
            )
        ) {
            closeApplyModal();
        }
    }
);


/* =========================================================
   NAVBAR SMOOTH SCROLL
========================================================= */

document.querySelectorAll(
    'a[href^="#"]'
).forEach(link => {

    link.addEventListener(
        "click",
        function (event) {

            const targetId =
                link.getAttribute("href");


            if (
                !targetId ||
                targetId === "#"
            ) {
                return;
            }


            const target =
                document.querySelector(
                    targetId
                );


            if (!target) {
                return;
            }


            event.preventDefault();


            target.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );
});


/* =========================================================
   INITIAL LOAD
========================================================= */

loadInternships();