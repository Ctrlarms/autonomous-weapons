"""Fill country contacts from the UN Geneva Blue Book.

Run from the project directory:
    python3 -m pip install requests beautifulsoup4
    python3 update_contacts.py

Only the public mission's general email is collected. Existing addresses are
retained. Matches with uncertain names are left for manual review.
"""

import csv
import json
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import urljoin
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

ROOT = "https://www.ungeneva.org"
INDEX = f"{ROOT}/en/blue-book/missions/member-states"
DATA = Path("countries.json")
REPORT = Path("contacts_to_review.csv")
USER_AGENT = "CtrlarmsContactResearch/1.0 (public institutional directory, low volume)"

ALIASES = {
    "bolivia": "bolivia plurinational state of",
    "czechia": "czechia",
    "democratic peoples republic of korea": "democratic peoples republic of korea",
    "gambia": "gambia republic of the",
    "iran": "iran islamic republic of",
    "lao pdr": "lao peoples democratic republic",
    "micronesia": "micronesia federated states of",
    "moldova": "republic of moldova",
    "nauru": "naoero",
    "netherlands": "netherlands kingdom of the",
    "russia": "russian federation",
    "syria": "syrian arab republic",
    "tanzania": "united republic of tanzania",
    "united kingdom": "united kingdom of great britain and northern ireland",
    "united states": "united states of america",
    "venezuela": "venezuela bolivarian republic of",
    "vietnam": "viet nam",
}


def key(value):
    plain = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", plain.lower()).strip()


def get_page(session, address):
    response = session.get(address, timeout=25)
    response.raise_for_status()
    time.sleep(0.5)
    return BeautifulSoup(response.text, "html.parser")


def mission_links(soup):
    found = {}
    for link in soup.select('a[href*="/blue-book/missions/member-states/"]'):
        href = urljoin(ROOT, link.get("href", ""))
        name = key(link.get_text(" ", strip=True))
        if name and href.startswith(INDEX + "/"):
            found[name] = href
    return found


def email_from_profile(soup):
    # The Blue Book displays its official email after a label "Email".
    lines = [part.strip() for part in soup.stripped_strings]
    for index, value in enumerate(lines):
        if value.lower() == "email":
            for candidate in lines[index + 1:index + 4]:
                match = re.search(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", candidate)
                if match:
                    return match.group(0)
    return None


def main():
    if not DATA.exists():
        raise SystemExit("countries.json was not found. Run this in your repository directory.")

    with DATA.open(encoding="utf-8") as handle:
        countries = json.load(handle)

    robot = RobotFileParser()
    robot.set_url(ROOT + "/robots.txt")
    try:
        robot.read()
    except Exception as exc:
        raise SystemExit(f"Could not check robots.txt: {exc}. No requests were made to the directory.")
    if not robot.can_fetch(USER_AGENT, INDEX):
        raise SystemExit("Automated access to the Blue Book is not permitted by robots.txt.")

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    links = mission_links(get_page(session, INDEX))
    print(f"Found {len(links)} mission profile links.")

    added = 0
    needs_review = []
    for country in countries:
        name = country["name"]
        lookup = ALIASES.get(key(name), key(name))
        address = links.get(lookup)
        if not address:
            needs_review.append((name, "No unambiguous mission match", ""))
            continue

        if not robot.can_fetch(USER_AGENT, address):
            needs_review.append((name, "Mission page disallowed by robots.txt", address))
            continue

        # We may replace a generic directory link with an exact source URL.
        country["contactDirectory"] = address
        if country.get("email"):
            continue
        try:
            email = email_from_profile(get_page(session, address))
        except requests.RequestException as exc:
            needs_review.append((name, f"Request failed: {exc}", address))
            continue
        if email:
            country["email"] = email
            added += 1
            print(f"+ {name}: {email}")
        else:
            needs_review.append((name, "No public email found on mission page", address))

    # Write safely, leaving the original available for comparison.
    output = Path("countries.updated.json")
    output.write_text(json.dumps(countries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with REPORT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["country", "issue", "official_profile"])
        writer.writerows(needs_review)
    print(f"\nAdded {added} addresses. Saved {output}; review {len(needs_review)} rows in {REPORT}.")
    print("Check sample results before replacing countries.json.")


if __name__ == "__main__":
    main()
