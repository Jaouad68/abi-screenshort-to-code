(function () {
  "use strict";

  /* ---------- Mobile menu toggle ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var mobileNav = document.getElementById("mobileNav");
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener("click", function () {
      mobileNav.classList.toggle("open");
    });
    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileNav.classList.remove("open");
      });
    });
  }

  /* ---------- Search panel toggle ---------- */
  var searchToggle = document.getElementById("searchToggle");
  var searchPanel = document.getElementById("searchPanel");
  var searchClose = document.getElementById("searchClose");
  if (searchToggle && searchPanel) {
    searchToggle.addEventListener("click", function () {
      searchPanel.classList.toggle("open");
      if (searchPanel.classList.contains("open")) {
        var input = searchPanel.querySelector("input");
        if (input) input.focus();
      }
    });
  }
  if (searchClose && searchPanel) {
    searchClose.addEventListener("click", function () {
      searchPanel.classList.remove("open");
    });
  }

  /* ---------- Bag counter (demo only) ---------- */
  var bagToggle = document.getElementById("bagToggle");
  var bagCount = document.getElementById("bagCount");
  var count = 0;
  document.querySelectorAll(".btn-primary").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      count += 1;
      if (bagCount) bagCount.textContent = String(count);
    });
  });

  /* ---------- Hero carousel ---------- */
  var track = document.getElementById("heroTrack");
  var dotsWrap = document.getElementById("heroDots");
  if (track && dotsWrap) {
    var slides = Array.prototype.slice.call(track.children);
    var index = 0;
    var timer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      if (i === 0) dot.classList.add("active");
      dot.setAttribute("aria-label", "Aller à la diapositive " + (i + 1));
      dot.addEventListener("click", function () {
        goTo(i);
        restart();
      });
      dotsWrap.appendChild(dot);
    });

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = "translateX(-" + index * 100 + "%)";
      Array.prototype.forEach.call(dotsWrap.children, function (d, di) {
        d.classList.toggle("active", di === index);
      });
    }

    function next() { goTo(index + 1); }

    function restart() {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 6000);
    }

    restart();
  }

  /* ---------- Nav background on scroll ---------- */
  var nav = document.getElementById("globalNav");
  if (nav) {
    window.addEventListener("scroll", function () {
      nav.style.background = window.scrollY > 4
        ? "rgba(0,0,0,0.9)"
        : "rgba(0,0,0,0.8)";
    });
  }
})();
