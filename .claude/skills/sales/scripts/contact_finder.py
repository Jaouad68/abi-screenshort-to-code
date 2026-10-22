#!/usr/bin/env python3
"""
Contact Finder — AI Sales Team for Claude Code
Extracts leadership and team information from company web pages.

Usage:
    python3 contact_finder.py --url <url> --output json
    python3 contact_finder.py --help
"""

import argparse
import json
import re
import ssl
import sys
from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse

try:
    from urllib.request import Request, urlopen
    from urllib.error import HTTPError, URLError
except ImportError:
    pass

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TEAM_PATHS = ["/about", "/team", "/leadership", "/our-team", "/people",
              "/about-us", "/company/team", "/company/leadership", "/staff"]

SENIORITY_MAP = {
    "C-Suite": ["ceo", "cto", "cfo", "coo", "cmo", "cpo", "cro", "ciso",
                "chief", "founder", "co-founder", "cofounder", "president",
                "managing director", "general manager", "partner"],
    "VP": ["vice president", "vp ", "vp,", "svp", "evp", "head of"],
    "Director": ["director", "senior director", "group director"],
    "Manager": ["manager", "senior manager", "team lead", "lead"],
    "IC": ["engineer", "analyst", "specialist", "coordinator", "designer",
           "developer", "associate", "consultant", "architect"],
}

DEPARTMENT_MAP = {
    "Engineering": ["engineering", "developer", "software", "devops", "infrastructure",
                    "platform", "architect", "cto", "technical", "frontend", "backend"],
    "Sales": ["sales", "business development", "account executive", "account manager",
              "revenue", "cro", "partnerships"],
    "Marketing": ["marketing", "growth", "brand", "content", "cmo", "communications",
                  "demand gen", "pr", "public relations"],
    "Product": ["product", "cpo", "product manager", "product design", "ux", "ui"],
    "Operations": ["operations", "coo", "ops", "supply chain", "logistics"],
    "Finance": ["finance", "cfo", "accounting", "controller", "treasurer", "investor relations"],
    "HR": ["human resources", "hr", "people", "talent", "recruiting", "culture"],
    "Legal": ["legal", "counsel", "compliance", "general counsel"],
    "Customer Success": ["customer success", "customer support", "client services", "support"],
}

BUYING_ROLES = {
    "Economic Buyer": ["ceo", "cfo", "coo", "president", "founder", "managing director",
                       "general manager", "partner", "owner"],
    "Champion": ["vp", "vice president", "head of", "director", "senior director"],
    "Evaluator": ["manager", "senior manager", "team lead", "lead", "principal"],
    "End User": ["engineer", "analyst", "specialist", "developer", "designer"],
    "Blocker": ["legal", "counsel", "compliance", "procurement", "purchasing"],
}


# ---------------------------------------------------------------------------
# Network + parsing helpers
# ---------------------------------------------------------------------------

def fetch_url(url, timeout=10):
    """Fetch a URL and return (status, html). Returns (None, None) on failure."""
    ctx = ssl.create_default_context()
    headers = {"User-Agent": "Mozilla/5.0 (compatible; ContactFinder/1.0)"}
    req = Request(url, headers=headers)
    try:
        resp = urlopen(req, timeout=timeout, context=ctx)
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.status, resp.read().decode(charset, errors="replace")
    except HTTPError as exc:
        return exc.code, None
    except (URLError, OSError, Exception):
        return None, None


def classify_seniority(title):
    """Classify a job title into a seniority level."""
    title_lower = title.lower()
    for level, keywords in SENIORITY_MAP.items():
        for kw in keywords:
            if kw in title_lower:
                return level
    return "Unknown"


def classify_department(title):
    """Classify a job title into a department."""
    title_lower = title.lower()
    for dept, keywords in DEPARTMENT_MAP.items():
        for kw in keywords:
            if kw in title_lower:
                return dept
    return "Unknown"


def predict_buying_role(title):
    """Predict a contact's buying role based on title."""
    title_lower = title.lower()
    for role, keywords in BUYING_ROLES.items():
        for kw in keywords:
            if kw in title_lower:
                return role
    return "Unknown"


# ---------------------------------------------------------------------------
# Extraction methods
# ---------------------------------------------------------------------------

def extract_json_ld_people(html):
    """Extract Person schema from JSON-LD blocks."""
    people = []
    for match in re.finditer(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(match.group(1))
            items = data if isinstance(data, list) else [data]
            for item in items:
                if isinstance(item, dict):
                    if item.get("@type") == "Person":
                        people.append(_person_from_ld(item))
                    elif item.get("@type") == "Organization":
                        for member in item.get("member", []):
                            if isinstance(member, dict):
                                people.append(_person_from_ld(member))
                        for emp in item.get("employee", []):
                            if isinstance(emp, dict):
                                people.append(_person_from_ld(emp))
        except (json.JSONDecodeError, TypeError):
            pass
    return people


def _person_from_ld(item):
    """Convert a JSON-LD Person to our contact format."""
    name = item.get("name", "")
    title = item.get("jobTitle", item.get("roleName", ""))
    url = item.get("url", "")
    same_as = item.get("sameAs", [])
    linkedin = ""
    if isinstance(same_as, list):
        for link in same_as:
            if "linkedin.com" in str(link):
                linkedin = link
                break
    elif isinstance(same_as, str) and "linkedin.com" in same_as:
        linkedin = same_as
    return {"name": name, "title": title, "linkedin": linkedin or url}


def extract_card_people(html):
    """Extract people from common team card/grid patterns."""
    people = []
    # Pattern 1: heading (name) followed by paragraph (title)
    pattern1 = re.compile(
        r'<(?:h[2-5]|strong|b)[^>]*>\s*([A-Z][\w\s.\'-]{1,40})\s*</(?:h[2-5]|strong|b)>'
        r'\s*(?:<[^>]*>)*\s*'
        r'<(?:p|span|div|small)[^>]*>\s*([\w\s,&/\'-]{3,80})\s*</(?:p|span|div|small)>',
        re.IGNORECASE | re.DOTALL,
    )
    for m in pattern1.finditer(html):
        name = _clean_text(m.group(1))
        title = _clean_text(m.group(2))
        if _is_valid_person(name, title):
            linkedin = _find_nearby_linkedin(html, m.start(), m.end())
            people.append({"name": name, "title": title, "linkedin": linkedin})

    # Pattern 2: image alt text as name with nearby title
    pattern2 = re.compile(
        r'<img[^>]*alt="([A-Z][\w\s.\'-]{1,40})"[^>]*/?>',
        re.IGNORECASE,
    )
    for m in pattern2.finditer(html):
        name = _clean_text(m.group(1))
        if len(name.split()) >= 2:
            context = html[m.end():m.end() + 500]
            title_match = re.search(
                r'<(?:p|span|div|h[3-5])[^>]*>\s*([\w\s,&/\'-]{3,80})\s*</(?:p|span|div|h[3-5])>',
                context, re.IGNORECASE,
            )
            if title_match:
                title = _clean_text(title_match.group(1))
                if _is_valid_person(name, title):
                    linkedin = _find_nearby_linkedin(html, m.start(), m.end() + 500)
                    people.append({"name": name, "title": title, "linkedin": linkedin})

    return people


def extract_list_people(html):
    """Extract people from structured lists."""
    people = []
    li_pattern = re.compile(
        r'<li[^>]*>.*?'
        r'([A-Z][\w\s.\'-]{1,40})\s*[-,|:]\s*([\w\s,&/\'-]{3,80})'
        r'.*?</li>',
        re.IGNORECASE | re.DOTALL,
    )
    for m in li_pattern.finditer(html):
        name = _clean_text(m.group(1))
        title = _clean_text(m.group(2))
        if _is_valid_person(name, title):
            linkedin = _find_nearby_linkedin(html, m.start(), m.end())
            people.append({"name": name, "title": title, "linkedin": linkedin})
    return people


def _clean_text(text):
    """Clean extracted text."""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _is_valid_person(name, title):
    """Validate that extracted data looks like a real person + title."""
    if not name or not title:
        return False
    if len(name.split()) < 2:
        return False
    if len(name) > 50 or len(title) > 100:
        return False
    noise = ["lorem", "ipsum", "example", "test", "image", "photo", "alt",
             "read more", "learn more", "click here", "view profile"]
    for n in noise:
        if n in name.lower() or n in title.lower():
            return False
    return True


def _find_nearby_linkedin(html, start, end):
    """Look for a LinkedIn URL near the matched region."""
    window = html[max(0, start - 200):min(len(html), end + 200)]
    match = re.search(r'https?://(?:www\.)?linkedin\.com/in/[\w-]+/?', window)
    return match.group(0) if match else ""


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def find_contacts(url):
    """Find team contacts from a company website."""
    parsed = urlparse(url)
    if not parsed.scheme:
        url = "https://" + url
    base = f"{urlparse(url).scheme}://{urlparse(url).netloc}"

    all_people = []
    pages_checked = []
    errors = []

    for path in TEAM_PATHS:
        page_url = urljoin(base, path)
        status, html = fetch_url(page_url, timeout=8)
        if status == 200 and html:
            pages_checked.append(page_url)
            # Try all extraction methods
            all_people.extend(extract_json_ld_people(html))
            all_people.extend(extract_card_people(html))
            all_people.extend(extract_list_people(html))
        elif status and status != 404:
            errors.append(f"{page_url}: HTTP {status}")

    # Deduplicate by name
    seen = set()
    unique = []
    for person in all_people:
        key = person["name"].lower().strip()
        if key not in seen and person["name"]:
            seen.add(key)
            title = person.get("title", "")
            unique.append({
                "name": person["name"],
                "title": title,
                "seniority": classify_seniority(title),
                "department": classify_department(title),
                "linkedin": person.get("linkedin", ""),
                "buying_role": predict_buying_role(title),
            })

    # Sort by seniority importance
    seniority_order = {"C-Suite": 0, "VP": 1, "Director": 2, "Manager": 3, "IC": 4, "Unknown": 5}
    unique.sort(key=lambda x: seniority_order.get(x["seniority"], 5))

    return {
        "url": url,
        "pages_checked": pages_checked,
        "contacts": unique[:30],
        "total_found": len(unique),
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Contact Finder — Extract leadership and team info from company websites.",
        epilog="Example: python3 contact_finder.py --url https://example.com --output json",
    )
    parser.add_argument("--url", required=True, help="Company website URL")
    parser.add_argument("--output", choices=["json"], default="json", help="Output format (default: json)")
    args = parser.parse_args()

    result = find_contacts(args.url)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
