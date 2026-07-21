const logBootstrap = (message) => {
  const journal = document.getElementById("journal").innerHTML;
  document.getElementById("journal").innerHTML =
    "- " + message + "\n" + journal;
};

window.bootstrap = async () => {
  const baseUrl = document.getElementById("base-url").value;

  const postResource = async (url, data) => {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${window.token()}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      return logBootstrap(
        `FAIL post to ${url} id: ${data.id}: ${response.status} ${response.statusText}`,
      );
    }
    logBootstrap(`Successfully posted to ${url} id: ${data.id}`);
  };

  const resources = [
    // StructureDefinition: TutorNotificationTemplate
    {
      url: `${baseUrl}/StructureDefinition`,
      data: {
        id: "TutorNotificationTemplate",
        resourceType: "StructureDefinition",
        url: "http://example.com/aidbox-sms-tutor/TutorNotificationTemplate",
        type: "TutorNotificationTemplate",
        name: "TutorNotificationTemplate",
        status: "active",
        abstract: false,
        kind: "resource",
        baseDefinition: "http://hl7.org/fhir/StructureDefinition/DomainResource",
        derivation: "specialization",
        differential: {
          element: [
            {
              id: "TutorNotificationTemplate",
              path: "TutorNotificationTemplate",
              min: 0,
              max: "*",
            },
            {
              id: "TutorNotificationTemplate.template",
              path: "TutorNotificationTemplate.template",
              min: 1,
              max: "1",
              type: [{ code: "string" }],
            },
          ],
        },
      },
    },
    // StructureDefinition: TutorNotification
    {
      url: `${baseUrl}/StructureDefinition`,
      data: {
        id: "TutorNotification",
        resourceType: "StructureDefinition",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification",
        type: "TutorNotification",
        name: "TutorNotification",
        status: "active",
        abstract: false,
        kind: "resource",
        baseDefinition: "http://hl7.org/fhir/StructureDefinition/DomainResource",
        derivation: "specialization",
        differential: {
          element: [
            {
              id: "TutorNotification",
              path: "TutorNotification",
              min: 0,
              max: "*",
            },
            {
              id: "TutorNotification.type",
              path: "TutorNotification.type",
              min: 1,
              max: "1",
              type: [{ code: "string" }],
              binding: {
                valueSet: "http://hl7.org/fhir/ValueSet/contact-point-system",
                strength: "required",
              },
            },
            {
              id: "TutorNotification.status",
              path: "TutorNotification.status",
              min: 1,
              max: "1",
              type: [{ code: "string" }],
              binding: {
                valueSet: "http://hl7.org/fhir/ValueSet/task-status",
                strength: "required",
              },
              constraint: [
                {
                  key: "cont-status",
                  severity: "error",
                  human: "Status should be 'requested', 'in-progress' or 'completed'",
                  expression:
                    "%context='requested' or %context='in-progress' or %context='completed'",
                },
              ],
            },
            {
              id: "TutorNotification.template",
              path: "TutorNotification.template",
              min: 1,
              max: "1",
              type: [
                {
                  code: "Reference",
                  targetProfile: [
                    "http://example.com/aidbox-sms-tutor/TutorNotificationTemplate",
                  ],
                },
              ],
            },
            {
              id: "TutorNotification.message",
              path: "TutorNotification.message",
              min: 0,
              max: "1",
              type: [{ code: "string" }],
            },
            {
              id: "TutorNotification.sendAfter",
              path: "TutorNotification.sendAfter",
              min: 1,
              max: "1",
              type: [{ code: "dateTime" }],
            },
            {
              id: "TutorNotification.subject",
              path: "TutorNotification.subject",
              min: 1,
              max: "1",
              type: [
                {
                  code: "Reference",
                  targetProfile: [
                    "http://hl7.org/fhir/StructureDefinition/Patient",
                  ],
                },
              ],
            },
            {
              id: "TutorNotification.templateParameters",
              path: "TutorNotification.templateParameters",
              min: 0,
              max: "1",
              type: [{ code: "BackboneElement" }],
            },
            {
              id: "TutorNotification.templateParameters.patientName",
              path: "TutorNotification.templateParameters.patientName",
              min: 0,
              max: "1",
              type: [{ code: "string" }],
            },
          ],
        },
      },
    },
    // SearchParameter: type
    {
      url: `${baseUrl}/SearchParameter`,
      data: {
        resourceType: "SearchParameter",
        id: "TutorNotification-type",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification-type",
        version: "0.0.1",
        status: "draft",
        name: "type",
        code: "type",
        base: ["TutorNotification"],
        type: "token",
        description: "Search TutorNotification by type",
        expression: "TutorNotification.type",
      },
    },
    // SearchParameter: status
    {
      url: `${baseUrl}/SearchParameter`,
      data: {
        resourceType: "SearchParameter",
        id: "TutorNotification-status",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification-status",
        version: "0.0.1",
        status: "draft",
        name: "status",
        code: "status",
        base: ["TutorNotification"],
        type: "token",
        description: "Search TutorNotification by status",
        expression: "TutorNotification.status",
      },
    },
    // SearchParameter: after
    {
      url: `${baseUrl}/SearchParameter`,
      data: {
        resourceType: "SearchParameter",
        id: "TutorNotification-after",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification-after",
        version: "0.0.1",
        status: "draft",
        name: "after",
        code: "after",
        base: ["TutorNotification"],
        type: "date",
        description: "Search TutorNotification by sendAfter",
        expression: "TutorNotification.sendAfter",
      },
    },
    // SearchParameter: subject
    {
      url: `${baseUrl}/SearchParameter`,
      data: {
        resourceType: "SearchParameter",
        id: "TutorNotification-subject",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification-subject",
        version: "0.0.1",
        status: "draft",
        name: "subject",
        code: "subject",
        base: ["TutorNotification"],
        type: "reference",
        description: "Search TutorNotification by subject",
        expression: "TutorNotification.subject",
      },
    },
    // SearchParameter: template
    {
      url: `${baseUrl}/SearchParameter`,
      data: {
        resourceType: "SearchParameter",
        id: "TutorNotification-template",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification-template",
        version: "0.0.1",
        status: "draft",
        name: "template",
        code: "template",
        base: ["TutorNotification"],
        type: "reference",
        description: "Search TutorNotification by template",
        expression: "TutorNotification.template",
      },
    },
    // Initial data: TutorNotificationTemplate
    {
      url: `${baseUrl}/TutorNotificationTemplate`,
      data: {
        id: "welcome",
        resourceType: "TutorNotificationTemplate",
        template: "Hello user name: {{patientName}}",
      },
    },
    // Initial data: Patient
    {
      url: `${baseUrl}/Patient`,
      data: {
        id: "pt-1",
        resourceType: "Patient",
        name: [
          {
            given: ["James"],
            family: "Morgan",
          },
        ],
      },
    },
  ];

  logBootstrap("Bootstrap begin...");
  for (const resource of resources) {
    await postResource(resource.url, resource.data);
  }
  logBootstrap("Bootstrap end.");
};
