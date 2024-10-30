import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { publicBuilderClient } from "@/hooks/use-client.jsx";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function constructName(name) {
  if (!name) {
    return "Unknown";
  } else if (name?.[0]["text"]) {
    return `${name?.[0].text}`;
  } else {
    const prefix = name?.[0].prefix?.[0] ?? "";
    const givenName = name?.[0].given?.[0] ?? "";
    const familyName = name?.[0].family ?? "";

    return `${prefix} ${givenName} ${familyName}`.replace(/\s+/g, " ").trim();
  }
}

export const constructAddress = (address) => {
  const line = address[0].line?.[0] ?? "";
  const city = address[0].city ?? "";
  const state = address[0].state ?? "";
  const postalCode = address[0].postalCode ?? "";
  const country = address[0].country ?? "";

  return `${line}, ${city}, ${state} ${postalCode}, ${country}`;
};

export function constructGender(gender) {
  return gender ? gender.charAt(0).toUpperCase() + gender.slice(1) : "unknown";
}

export function constructInitials(name) {
  const [givenName, familyName] = constructName(name).split(" ");
  return familyName
    ? `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase()
    : givenName.substring(0, 2).toUpperCase();
}

export function calculatePagination(currentPage, totalPages) {
  const maxPagesToShow = 5; // Adjust as needed
  const pagesToShowBeforeCurrent = 2;
  const pagesToShowAfterCurrent = 2;

  currentPage = Math.max(1, Math.min(currentPage, totalPages)); // Ensure currentPage is within bounds

  const prevButtonEnabled = currentPage > 1;
  const nextButtonEnabled = currentPage < totalPages;

  let startPage = Math.max(1, currentPage - pagesToShowBeforeCurrent);
  let endPage = Math.min(totalPages, currentPage + pagesToShowAfterCurrent);

  // Prioritize showing pages around the current page
  while (
    endPage - startPage + 1 < maxPagesToShow &&
    (startPage > 1 || endPage < totalPages)
  ) {
    if (startPage > 1) {
      startPage--;
    }
    if (endPage < totalPages && endPage - startPage + 1 < maxPagesToShow) {
      // Only expand endPage if there's still room
      endPage++;
    }
  }

  const pages = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const showFirstPageButton = startPage > 1;
  const showLastPageButton = endPage < totalPages;
  const showFirstEllipsis = startPage > 2; // Simplify ellipsis logic
  const showLastEllipsis = endPage < totalPages - 1;

  return {
    prevButtonEnabled,
    showFirstPageButton,
    showFirstEllipsis,
    pagesBeforeCurrent: pages.filter((p) => p < currentPage),
    currentPage,
    pagesAfterCurrent: pages.filter((p) => p > currentPage),
    showLastEllipsis,
    showLastPageButton,
    nextButtonEnabled,
  };
}

export async function populate({ questionnaire, subject, encounter, author }) {
  const {
    parameter: [{ resource }],
  } = await publicBuilderClient.request({
    url: "Questionnaire/$populate",
    method: "POST",
    headers: {
      "Content-Type": "application/fhir+json",
    },
    body: JSON.stringify({
      resourceType: "Parameters",
      parameter: [
        {
          name: "questionnaire",
          resource: questionnaire,
        },
        {
          name: "subject",
          resource: subject,
        },
        {
          name: "context",
          part: [
            ...(encounter
              ? [
                  {
                    name: "name",
                    valueString: "encounter",
                  },
                  {
                    name: "content",
                    resource: encounter,
                  },
                ]
              : []),
            ...(author
              ? [
                  {
                    name: "name",
                    valueString: "author",
                  },
                  {
                    name: "content",
                    resource: author,
                  },
                ]
              : []),
          ],
        },
      ],
    }),
  });

  return resource;
}

export function saveQuestionnaireResponse(
  client,
  questionnaire,
  questionnaireResponse,
) {
  let url = "QuestionnaireResponse";
  let method = "POST";

  if (questionnaireResponse.id) {
    url += `/${questionnaireResponse.id}`;
    method = "PUT";
  }

  return client.request({
    url,
    method,
    headers: { "Content-Type": "application/fhir+json" },
    body: JSON.stringify({
      ...questionnaireResponse,
      // Plugging questionnaire.id in because SMART Health IT requires QRs to have Questionnaire/{id} as reference
      questionnaire: questionnaire.url
        ? questionnaire.url
        : `Questionnaire/${questionnaire.id}`,
      meta: {
        ...questionnaireResponse.meta,
        source: "https://aidbox.github.io/examples/aidbox-forms-smart-launch",
      },
    }),
  });
}

export function saveQuestionnaire(client, questionnaire) {
  let url = "Questionnaire";
  let method = "POST";

  if (questionnaire.id) {
    url += `/${questionnaire.id}`;
    method = "PUT";
  }

  return client.request({
    url,
    method,
    headers: { "Content-Type": "application/fhir+json" },
    body: JSON.stringify(questionnaire),
  });
}

export function deleteQuestionnaire(client, questionnaire) {
  return client.request({
    url: `Questionnaire/${questionnaire.id}`,
    method: "DELETE",
  });
}

export async function createQuestionnaireResponse({
  client,
  questionnaire,
  subject,
  encounter,
  author,
}) {
  const questionnaireResponse = await populate({
    questionnaire,
    subject,
    encounter,
    author,
  });

  return saveQuestionnaireResponse(
    client,
    questionnaire,
    questionnaireResponse,
  );
}

export function createSmartAppLauncherUrl({
  launchUrl,
  launchType,
  fhirVersion,
}) {
  const launchTypes = [
    "provider-ehr",
    "patient-portal",
    "provider-standalone",
    "patient-standalone",
    "backend-service",
  ];

  const qs = new URLSearchParams();
  qs.set("fhir_version", fhirVersion || "r4");
  qs.set("launch_url", launchUrl.toString());
  qs.set("launch", btoa(JSON.stringify([launchTypes.indexOf(launchType)])));

  return `https://launch.smarthealthit.org/?${qs.toString()}`;
}

export function unbundle(result) {
  const resource =
    result.resourceType === "Bundle" ? result.entry?.[0]?.resource : result;

  if (!resource) {
    throw new Error("Resource not found");
  }

  return resource;
}

export async function findQuestionnaireWithClient(client, ref) {
  const query = ref.startsWith("http")
    ? `Questionnaire?url=${ref.replace(/\|.*$/, "")}`
    : `Questionnaire/${ref.replace(/^Questionnaire\//, "")}`;

  return Promise.any([
    publicBuilderClient
      .request(query)
      .then((result) => [publicBuilderClient, unbundle(result)]),
    client.request(query).then((result) => [client, unbundle(result)]),
    publicBuilderClient
      .request(ref)
      .then((result) => [publicBuilderClient, unbundle(result)]),
  ]);
}

export async function findQuestionnaire(client, ref) {
  return findQuestionnaireWithClient(client, ref).then(
    ([, questionnaire]) => questionnaire,
  );
}

export async function getPager(client, baseUrl, pageSize) {
  const serverUrl = client.state.serverUrl.endsWith("/")
    ? client.state.serverUrl
    : `${client.state.serverUrl}/`;

  const url = new URL(baseUrl, serverUrl);

  // Get the first page to determine pagination method
  const data = await client.request(url.toString());
  const link = data.link.filter(
    (x) => x.relation === "self" || x.relation === "first",
  )?.[0];

  if (link) {
    const url = new URL(link.url, serverUrl);

    // Check if the server uses page base or offset based pagination
    const pageParam = [...url.searchParams]
      .map(([key]) => {
        if (key.toLocaleLowerCase().includes("offset")) {
          return {
            param: key,
            type: "offset",
          };
        } else if (key.toLocaleLowerCase().includes("page")) {
          return {
            param: key,
            type: "page",
          };
        }
      })
      .filter(Boolean)[0];

    // If we found a pagination method, return a function to fetch a specific page
    if (pageParam) {
      url.searchParams.set("_count", pageSize);

      return (page) => {
        if (pageParam.type === "offset") {
          // Offset based pagination
          url.searchParams.set(pageParam.param, `${pageSize * (page - 1)}`);
        } else {
          // Page based pagination
          url.searchParams.set(pageParam.param, `${page}`);
        }
        return client.request(url.toString());
      };
    }
  }

  // Can't determine pagination method, just return everything
  // todo: fallback to prev/next based pagination
  return (_page) => {
    // Remove _count parameter to get all results
    url.searchParams.delete("_count");
    return client.request(url.toString()).then((data) => {
      return {
        ...data,
        // Hide the real total count from the user
        total: data.entry?.length || 0,
      };
    });
  };
}
