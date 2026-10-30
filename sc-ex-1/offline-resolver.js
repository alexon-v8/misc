/**
 * Offline & Local File Environment Resolver
 * Automatically detects if the website is running locally (e.g. file:/// protocol or localhost),
 * normalizes all hyperlink anchors to point to local files in the same directory,
 * and restricts page/resource lookups to the local sibling directory.
 */
(function() {
  const isFile = window.location.protocol === 'file:';
  const isLocal = isFile || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const LOCAL_MODULE_FILES = [
    "index.html",
    "mirror-clock.html",
    "calendar-mod7.html",
    "squaring-shortcut.html",
    "sqrt-perfect.html",
    "newton-sqrt.html",
    "cbrt-perfect.html",
    "rule-72-110.html",
    "mod9-checksum.html"
  ];

  /**
   * Rewrites an external or github URL to a local sibling file if it matches a known module.
   */
  function normalizeToLocalPath(href) {
    if (!href) return href;
    for (const file of LOCAL_MODULE_FILES) {
      // Matches: https://github.com/.../mirror-clock.html or /mirror-clock.html or mirror-clock.html
      if (href === file || href.endsWith("/" + file) || href.endsWith("\\" + file) || href.includes("/" + file + "?") || href.includes("/" + file + "#")) {
        return file;
      }
    }
    // If it is a generic GitHub repo link and we are running in file: mode, stay on index.html
    if (isFile && (href.includes("github.com/alexon-v8/misc") || href.includes("alexon-v8.github.io"))) {
      return "index.html";
    }
    return href;
  }

  /**
   * Scans all anchor tags and ensures they point to sibling files in the same directory.
   */
  function resolveAnchorLinks() {
    if (!isLocal) return;
    const anchors = document.querySelectorAll("a");
    anchors.forEach(a => {
      const orig = a.getAttribute("href");
      if (!orig) return;
      const normalized = normalizeToLocalPath(orig);
      if (normalized !== orig) {
        a.setAttribute("href", normalized);
      }
    });
  }

  // Run on initial load and DOM changes
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", resolveAnchorLinks);
  } else {
    resolveAnchorLinks();
  }

  // Export helper globally
  window.OfflineResolver = {
    isFile,
    isLocal,
    normalizeToLocalPath,
    LOCAL_MODULE_FILES
  };
})();
