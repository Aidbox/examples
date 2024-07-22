window.log = (s) => {
  const journal = document.getElementById("journal").innerHTML;
  document.getElementById("journal").innerHTML = "- " + s + "\n" + journal;
};

window.token = () => {
  const clientId = document.getElementById("client-id").value;
  const clientSecret = document.getElementById("client-secret").value;
  const token = btoa(`${clientId}:${clientSecret}`);
  return token;
};

window.updateCurrentNotification = (notification, patient, template) => {
  window.notification = notification;
  window.patient = patient;
  window.template = template;
  const html = `id: ${notification.id}\n    ${patient.name[0].given[0]} - ${notification.type} - ${notification.status} - ${notification.sendAfter}\n    template: ${template.template}\n    message: ${template.message}`;
  document.getElementById("notification").innerHTML = html;
};

window.requestNotification = async () => {
  const baseUrl = document.getElementById("base-url").value;
  const resourceUrl = "/TutorNotification";
  const url = `${baseUrl}${resourceUrl}`;

  const notification = {
    resourceType: "TutorNotification",
    type: "sms",
    status: "requested",
    template: {
      reference: "TutorNotificationTemplate/welcome",
    },
    sendAfter: "2024-07-12T12:00:00Z",
    subject: {
      reference: "Patient/pt-1",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${window.token()}`,
    },
    body: JSON.stringify(notification),
  });
  if (!response.ok) {
    return alert("Error: " + response.status + " " + response.statusText);
  }

  const json = await response.json();
  window.log("Notification generated: " + json.id);
};

window.getNotification = async () => {
  const baseUrl = document.getElementById("base-url").value;
  const resourceUrl = "/TutorNotification";
  const params = [
    "_count=1",
    "type=sms",
    "status=requested",
    "_include=TutorNotification:subject:Patient",
    "_include=TutorNotification:template:TutorNotificationTemplate",
  ].join("&");
  const url = `${baseUrl}${resourceUrl}?${params}`;

  const clientId = document.getElementById("client-id").value;
  const clientSecret = document.getElementById("client-secret").value;
  const token = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${window.token()}`,
    },
  });
  if (!response.ok) {
    return alert("Error: " + response.status + " " + response.statusText);
  }

  const json = await response.json();
  if (!json.entry || json.entry.length === 0) {
    return window.log(
      "No requested sms notifications found. Request one first.",
    );
  }
  const resources = json.entry.map((entry) => entry.resource);
  const {
    Patient: patients,
    TutorNotification: notifications,
    TutorNotificationTemplate: templates,
  } = Object.groupBy(resources, (e) => e.resourceType);

  const notification = notifications[0];
  const patient = patients[0];
  const template = templates[0];

  window.updateCurrentNotification(notification, patient, template);
  window.log("Notification retrieved to send: " + notification.id);

  window.notification = notification;
  window.patient = patient;
  window.template = template;
};

window.lockNotification = async () => {
  if (window.notification.status !== "requested") {
    return window.log("Notification is not available for lock, get it first.");
  }

  const baseUrl = document.getElementById("base-url").value;
  const resourceUrl = "/TutorNotification/" + window.notification.id;
  const url = `${baseUrl}${resourceUrl}`;

  const notification = { ...window.notification, status: "in-progress" };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${window.token()}`,
      "If-Match": notification.meta.versionId,
    },
    body: JSON.stringify(notification),
  });

  window.updateCurrentNotification(
    notification,
    window.patient,
    window.template,
  );
  console.log("Lock notification for processing");

  if (!response.ok) {
    return alert("Error: " + response.status + " " + response.statusText);
  }
  window.log("Lock notification: " + notification.id);
};

window.sendNotification = async () => {
  if (window.notification.status !== "in-progress") {
    return window.log(
      "Notification is not locked for processing. Lock it first.",
    );
  }

  const baseUrl = document.getElementById("base-url").value;
  const resourceUrl = "/TutorNotification/" + window.notification.id;
  const url = `${baseUrl}${resourceUrl}`;

  ////////////////////////////////////////////////////////////
  // Place for implementation of sending SMS
  const message = window.template.template.replace(
    "{{patient.name.given}}",
    window.patient.name[0].given[0],
  );

  const notification = {
    ...window.notification,
    status: "completed",
    message: message,
  };

  alert("Send SMS:\n\n" + notification.message);
  ////////////////////////////////////////////////////////////

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${window.token()}`,
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    return alert("Error: " + response.status + " " + response.statusText);
  }

  window.updateCurrentNotification(
    notification,
    window.patient,
    window.template,
  );
  window.log("Notification sent: " + notification.id);
};
