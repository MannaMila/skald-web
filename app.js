const supportsIntersectionObserver = "IntersectionObserver" in window;

if (supportsIntersectionObserver) {
  document.documentElement.classList.add("enhanced");
}

// When rendered inside a host page (e.g. the Google Sites embed at
// mannamila.com/skald), drop the standalone header/chrome so it reads as one page.
if (new URLSearchParams(window.location.search).has("embed")) {
  document.documentElement.classList.add("embed");
}

const header = document.querySelector("[data-header]");
const threadStage = document.querySelector(".thread-stage");
const threadProgress = document.querySelector("[data-thread-progress]");
const navLinks = new Map(
  [...document.querySelectorAll(".site-nav a")].map((link) => [
    link.getAttribute("href").slice(1),
    link,
  ]),
);

const updateScrollDetails = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);

  if (!threadStage || !threadProgress) return;

  const bounds = threadStage.getBoundingClientRect();
  const viewportAnchor = window.innerHeight * 0.55;
  const traversed = viewportAnchor - bounds.top;
  const progress = Math.min(1, Math.max(0, traversed / bounds.height));
  threadProgress.style.setProperty("--thread-progress", progress.toFixed(3));
};

let scrollFrame;
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateScrollDetails();
      scrollFrame = undefined;
    });
  },
  { passive: true },
);

if (supportsIntersectionObserver) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8%", threshold: 0.08 },
  );

  document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      const sectionName = visible.target.dataset.section;
      navLinks.forEach((link, name) => {
        link.classList.toggle("is-current", name === sectionName);
      });
    },
    { rootMargin: "-25% 0px -55%", threshold: [0.05, 0.2, 0.5] },
  );

  document.querySelectorAll("[data-section]").forEach((section) => sectionObserver.observe(section));
}

window.addEventListener("resize", updateScrollDetails, { passive: true });
updateScrollDetails();
