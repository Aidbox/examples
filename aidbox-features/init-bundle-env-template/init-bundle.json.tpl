{
  "type": "batch",
  "entry": [
    {
      "request": {
        "method": "PUT",
        "url": "/Client/${INIT_BUNDLE_CLIENT_ID}"
      },
      "resource": {
        "resourceType": "Client",
        "id": "${INIT_BUNDLE_CLIENT_ID}",
        "secret": "${INIT_BUNDLE_CLIENT_SECRET}",
        "grant_types": [
          "basic"
        ]
      }
    }
  ]
}
