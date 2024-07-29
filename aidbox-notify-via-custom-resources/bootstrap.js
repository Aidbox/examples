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
    // FHIRSchema: TutorNotificationTemplate
    {
      url: `${baseUrl}/FHIRSchema`,
      data: {
        id: "TutorNotificationTemplate",
        resourceType: "FHIRSchema",
        url: "http://example.com/aidbox-sms-tutor/TutorNotificationTemplate",
        type: "TutorNotificationTemplate",
        name: "TutorNotificationTemplate",
        base: "DomainResource",
        kind: "resource",
        derivation: "specialization",
        required: ["template"],
        elements: {
          template: {
            type: "string",
            scalar: true,
          },
        },
      },
    },
    // FHIRSchema: TutorNotification
    {
      url: `${baseUrl}/FHIRSchema`,
      data: {
        id: "TutorNotification",
        resourceType: "FHIRSchema",
        url: "http://example.com/aidbox-sms-tutor/TutorNotification",
        type: "TutorNotification",
        name: "TutorNotification",
        base: "DomainResource",
        kind: "resource",
        ALLOW_FHIR_SCHEMA_FHIR_INCOMPATIBLE_EXTENSIONS: true,
        derivation: "specialization",
        required: ["sendAfter", "status", "subject", "template", "type"],
        elements: {
          type: {
            type: "string",
            scalar: true,
            binding: {
              valueSet: "http://hl7.org/fhir/ValueSet/contact-point-system",
              strength: "required",
            },
          },
          status: {
            type: "string",
            scalar: true,
            binding: {
              valueSet: "http://hl7.org/fhir/ValueSet/task-status",
              strength: "required",
            },
            constraints: {
              "cont-status": {
                human:
                  "Status should be 'requested', 'in-progress' or 'completed'",
                severity: "error",
                expression:
                  "%context='requested' or %context='in-progress' or %context='completed'",
              },
            },
          },
          template: {
            type: "Reference",
            scalar: true,
            refers: ["TutorNotificationTemplate"],
          },
          message: {
            type: "string",
            scalar: true,
          },
          sendAfter: {
            type: "dateTime",
            scalar: true,
          },
          subject: {
            type: "Reference",
            scalar: true,
            refers: ["Patient"],
          },
          templateParameters: {
            scalar: true,
            additionalProperties: {
              type: "string",
            },
          },
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
