export const swaggerDocument = {
    "openapi": "3.0.3",
    "info": {
    "title": "HL7Demo",
    "description": "Server converting FHIR resources to HL7 messages",
    "version": "0.0.1"
  },
  "paths": {
    "/ping": {
        "get": {
            "summary": "Get test message",
            "description": "Get the test message",
            "parameters": [{"name": "Authorization",
                "in": "header",
                "required": true
            }],
            "responses": {
                "200": {
                    "description": "Got test message successfully",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "message": {
                                        "type": "string"
                                    }
                                },
                                "example": {
                                    "message": "Hello!"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "/webhook": {
        "post": {
            "summary": "Accept a WebHook message from Aidbox",
            "description": "Process WebHook-proviced Invoice resource and send the resulting HL7v2 BAR message to the hospital",
            "parameters": [{"name": "Authorization",
                "in": "header",
                "required": true
            }],
            "responses": {
                "200": {
                    "description": "WebHook processed",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "message": {
                                        "type": "string"
                                    }
                                },
                                "example": {
                                    "message": "Successful MLLP message send: MSA|AA|TODO"
                                }
                            }
                        }
                    }
                },
                "403": {
                    "description": "Authorization failed, likely due to missing SECRET or Authorization header",
                },
                "500": {
                    "description": "There was an error processing the WebHook, likely due to MLLP sending errors",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "message": {
                                        "type": "string"
                                    }
                                },
                                "example": {
                                    "message": "An error happened when sending MLLP message: ..."
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "/test": {
        "post": {
            "summary": "Accept a WebHook-like message and returns a resulting BAR message",
            "description": "Process WebHook-proviced Invoice resource and send the resulting HL7v2 BAR message to the hospital",
            "parameters": [{"name": "Authorization",
                "in": "header",
                "required": true
            }],
            "body": {"description": "FHIR history Bundle containing Invoice under one of the entries",
                "required": true
            },
            "responses": {
                "200": {
                    "description": "Message processed",
                    "content": {
                        "text/plain": {"example": "MSH|^~\&|DotBase|DotBase|CSP|050^0001|20250827140517||BAR^P12|404067258|P|2.5|||AL\nEVN|P12|20250826201121||\nPID||||||xxx||W|||||||||||||||||||||\nPV1|||M107B||||||||||||||||0318981461||||||||||||||||||||||||||||||||\nDG1|1|ICD10|C43.9|Malignant melanoma of skin unspecified|20250827000000|VD|||||||||2|||||214887|A\nDG1|2|ICD10|J45.909|Unspecified asthma uncomplicated|20250827000000|VD|||||||||2|||||214887|A\nDG1|3|ICD10|G43.909|Migraine unspecified not intractable without status migrainosus|20250827000000|VD|||||||||2|||||214887|A"}
                    }
                }
            }
        }
    }
  }
}