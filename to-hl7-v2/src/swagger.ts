export const swaggerDocument = {
    "openapi": "3.0.3",
    "info": {
    "title": "HL7Demo",
    "description": "Server converting FHIR resources to HL7 messages",
    "version": "0.0.1"
  },
  "paths": {
    "/": {
        "get": {
            "summary": "Get test message",
            "description": "Get the test message",
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
    }
  }
}