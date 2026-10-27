const countrySelect = document.querySelector("#country");
const resultsSection = document.querySelector("#results");

let countries = [];

const positionLabels = {
  yes: "SUPPORTS A LEGALLY BINDING TREATY",
  no: "DOES NOT SUPPORT TREATY NEGOTIATIONS",
  undeclared: "HAS NOT DECLARED SUPPORT"
};
const positionDescriptions = {
  yes: "This country has expressed support for negotiating a legally binding treaty on autonomous weapons.",
  no: "This country has not supported negotiations on a legally binding treaty.",
  undeclared: "This country has not publicly expressed clear support for treaty negotiations. This does not necessarily mean it opposes them."
};

async function loadCountries() {
  try {
    const response = await fetch("./countries.json");

    if (!response.ok) {
      throw new Error("Could not load country data");
    }

    countries = await response.json();
    countries.sort((a, b) => a.name.localeCompare(b.name, "en"));

    for (const country of countries) {
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = country.name;
      countrySelect.appendChild(option);
    }
  } catch (error) {
    console.error("Could not load countries:", error);
  }
}

function showCountry() {
  const country = countries.find(
    item => item.code === countrySelect.value
  );

  if (!country) {
    resultsSection.hidden = true;
    return;
  }

  const status = positionLabels[country.status] || "POSITION UNAVAILABLE";

  resultsSection.replaceChildren();

  const heading = document.createElement("h2");
  heading.textContent = country.name;

  const position = document.createElement("p");
  position.className = "position-label";
  position.textContent = status;

  const positionDescription = document.createElement("p");
  positionDescription.className = "position-description";
  positionDescription.textContent =
    positionDescriptions[country.status] || "";

  const source = document.createElement("a");
  source.href = country.positionSource;
  source.textContent = "VIEW SOURCE ↗";
  source.target = "_blank";
  source.rel = "noopener noreferrer";

 const emailHeading = document.createElement("h3");
emailHeading.textContent = "YOUR EMAIL";

const emailText = document.createElement("textarea");
emailText.id = "email-text";
emailText.value = emailTemplates[country.status](country.name);
emailText.rows = 12;
emailText.setAttribute("aria-label", "Edit your email");

const copyButton = document.createElement("button");
copyButton.type = "button";
copyButton.textContent = "COPY EMAIL";

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(emailText.value);
    copyButton.textContent = "COPIED!";
  } catch (error) {
    emailText.select();
    copyButton.textContent = "SELECT TEXT TO COPY";
  }
});

// Copy the email message
copyButton.textContent = "COPY EMAIL TEXT";

// Display the mission's email address
const addressHeading = document.createElement("h3");
const subjectHeading = document.createElement("h3");
subjectHeading.textContent = "EMAIL SUBJECT";

const emailSubject = document.createElement("div");
emailSubject.className = "email-address";
emailSubject.textContent = "Concerns about autonomous weapons";

const copySubjectButton = document.createElement("button");
copySubjectButton.type = "button";
copySubjectButton.textContent = "COPY EMAIL SUBJECT";

copySubjectButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(emailSubject.textContent);
    copySubjectButton.textContent = "SUBJECT COPIED!";
  } catch (error) {
    window.prompt("Copy the email subject:", emailSubject.textContent);
  }
});
addressHeading.textContent = "SEND TO";

const emailAddress = document.createElement("div");
emailAddress.className = "email-address";
emailAddress.textContent = country.email;

// Copy the mission's email address
const copyAddressButton = document.createElement("button");
copyAddressButton.type = "button";
copyAddressButton.textContent = "COPY EMAIL ADDRESS";

copyAddressButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(country.email);
    copyAddressButton.textContent = "ADDRESS COPIED!";
  } catch (error) {
    window.prompt("Copy this email address:", country.email);
  }
});

// Add everything to the page
resultsSection.append(
heading,
position,
positionDescription,
source,
emailHeading,
emailText,
copyButton,
subjectHeading,
emailSubject,
copySubjectButton,
addressHeading,
emailAddress,
copyAddressButton
);

resultsSection.hidden = false;

  resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

countrySelect.addEventListener("change", showCountry);

loadCountries();
const emailTemplates = {
  yes: country => `Dear Members of the Permanent Mission,

Thank you for ${country}’s support for a legally binding treaty on autonomous weapons.

Ahead of the Geneva talks, I hope your government will continue supporting negotiations for strong international rules that preserve meaningful human control over the use of force.

Best regards,
[Your name]`,

  no: country => `Dear Members of the Permanent Mission,

I am concerned that ${country} does not support negotiating a legally binding treaty on autonomous weapons.

Ahead of the Geneva talks, I urge your government to reconsider its position and support negotiations for clear, binding international rules.

Best regards,
[Your name]`,

  undeclared: country => `Dear Members of the Permanent Mission,

Ahead of the Geneva talks, I urge ${country} to publicly support negotiations on a legally binding treaty on autonomous weapons.

Clear international rules are needed to preserve meaningful human control over the use of force. Your government has an opportunity to help shape them.

Best regards,
[Your name]`
};