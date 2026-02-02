# SDC SMART Web Messaging

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![FHIR R4](https://img.shields.io/badge/FHIR-R4-green.svg)](https://hl7.org/fhir/R4/)
[![License](https://img.shields.io/badge/License-BSD%203--Clause-blue.svg)](LICENSE)

> **Note:** This project is not an official HL7 product, but is developed and maintained by the HL7 FHIR community.<br/>
> This is the first draft to investigate if there is further interest to collaborate on this approach for SDC Questionnaire rendering and interaction, and should it be further standardized beyond the initial parties.
>
> Initial collaborators include:
> * Brian Postlethwaite (Australia) - FHIRPath Lab
> * David Hay (New Zealand) - Forms Builder
> * Health Samurai (Portugal) - AidBox Forms

---

The SDC SMART Web Messaging protocol solves the challenge of integrating external FHIR questionnaire rendering engines into host applications safely and securely. Instead of requiring direct npm package dependencies that can cause framework conflicts and maintenance burdens, this protocol enables **secure integration** using standardized web messaging through either iframe embedding or popup windows.

The protocol extends [HL7 SMART Web Messaging](https://hl7.org/fhir/uv/smart-web-messaging/STU1/smart-web-messaging.html) with specific message types for questionnaire workflows: displaying questionnaires, capturing responses, requesting current form data, performing extractions, and handling real-time form change notifications. This approach enables host applications (like EHRs, clinical decision support tools, or form builders) to seamlessly integrate **any** FHIR questionnaire renderer - whether open source, commercial, or closed source - with minimal code changes or framework compatibility concerns.

Key benefits include framework-agnostic integration (no dependency conflicts), support for closed-source renderers, independent version management, enhanced security through sandboxed execution, and the ability to test forms without requiring external storage. The protocol supports both iframe embedding for seamless in-page integration and popup windows for dedicated form experiences. This makes it ideal for applications like FHIRPath Lab, form builders, educational tools, and any system needing flexible questionnaire rendering capabilities.

This repository provides both comprehensive protocol documentation and production-ready TypeScript type definitions.

## ✨ Features

- 📚 **Comprehensive protocol documentation** with examples
- 🎯 **Complete TypeScript definitions** for all SDC-SWM message types
- 🛡️ **Full FHIR R4 type safety** with `@types/fhir` integration
- 🔄 **Type guards** for runtime message routing and validation
- 🎨 **IntelliSense support** for all message payloads and FHIR resources
- 📦 **Zero runtime dependencies** - types only package
- 🚀 **Ready for production** use in SMART on FHIR applications

## 📚 Documentation

- **[Protocol Introduction](./docs/sdc-swm-intro.md)** - Overview and getting started
- **[Full Protocol Specification](./docs/sdc-swm-protocol.md)** - Complete technical specification
- **[Usage Examples](./examples/)** - TypeScript implementation examples

## 🚀 Quick Start

### Installation

```bash
# Install from GitHub
npm install github:FHIR/sdc-smart-web-messaging

# Install FHIR types (peer dependency)
npm install @types/fhir
```

### Basic Usage

```typescript
import { 
  SdcDisplayQuestionnaireRequest,
  StatusHandshakeRequest,
  isRequest,
  isEvent 
} from 'sdc-swm-protocol';

// Create a handshake request
const handshake: StatusHandshakeRequest = {
  messagingHandle: 'session-123',
  messageId: 'msg-001',
  messageType: 'status.handshake',
  payload: {
    protocolVersion: '1.0',
    fhirVersion: 'R4'
  }
};

// Create a display questionnaire request
const displayRequest: SdcDisplayQuestionnaireRequest = {
  messagingHandle: 'session-123',
  messageId: 'msg-002', 
  messageType: 'sdc.displayQuestionnaire',
  payload: {
    questionnaire: {
      resourceType: 'Questionnaire',
      status: 'active',
      title: 'Patient Survey',
      // ... full FHIR Questionnaire with IntelliSense
    }
  }
};
```

## 📋 Message Types Overview

The SDC-SWM protocol extends SMART Web Messaging with the following message types:

| Message Type | Direction | Description |
|--------------|-----------|-------------|
| `status.handshake` | ↔️ | Initial capability negotiation |
| `sdc.configure` | Host→Renderer | Send configuration (servers, settings) |
| `sdc.configureContext` | Host→Renderer | Send context (patient, encounter, etc.) |
| `sdc.displayQuestionnaire` | Host→Renderer | Display a questionnaire for completion |
| `sdc.displayQuestionnaireResponse` | Host→Renderer | Display a completed response |
| `sdc.requestCurrentQuestionnaireResponse` | Host→Renderer | Request current form data |
| `sdc.requestExtract` | Host→Renderer | Request $extract operation |
| `sdc.ui.changedQuestionnaireResponse` | Renderer→Host | Notify of form changes (unsolicited) |
| `sdc.ui.changedFocus` | Renderer→Host | Notify of focus changes (unsolicited) |
| `ui.done` | Renderer→Host | User completed interaction |

## 🔧 API Reference

### Core Types

```typescript
// Base message structures
SmartWebMessagingRequest<T>     // All requests
SmartWebMessagingResponse<T>    // All responses  
SmartWebMessagingEvent<T>       // Unsolicited events

// Message type unions
SdcRequest     // All possible request messages
SdcResponse    // All possible response messages
SdcEvent       // All possible event messages
```

### Message Handlers

```typescript
// Host-side message handlers
interface SdcHostMessageHandlers {
  handleStatusHandshake?: (msg: StatusHandshakeRequest) => Promise<StatusHandshakeResponsePayload>;
  handleChangedQuestionnaireResponse?: (event: SdcUiChangedQuestionnaireResponseEvent) => Promise<...>;
  handleChangedFocus?: (event: SdcUiChangedFocusEvent) => Promise<...>;
  handleUiDone?: (event: UiDoneEvent) => Promise<...>;
}

// Renderer-side message handlers  
interface SdcRendererMessageHandlers {
  handleStatusHandshake?: (msg: StatusHandshakeRequest) => Promise<...>;
  handleSdcConfigure?: (msg: SdcConfigureRequest) => Promise<...>;
  handleSdcDisplayQuestionnaire?: (msg: SdcDisplayQuestionnaireRequest) => Promise<...>;
  // ... all other message types
}
```

### Type Guards

```typescript
// Runtime message type checking
isRequest(message)   // Check if message is a request
isResponse(message)  // Check if message is a response  
isEvent(message)     // Check if message is an unsolicited event

// Usage example
function routeMessage(message: any) {
  if (isRequest(message)) {
    // Handle request...
  } else if (isEvent(message)) {
    // Handle unsolicited event...
  }
}
```

## 🏗️ Development

### Prerequisites

- Node.js 16+ 
- TypeScript 5.0+
- `@types/fhir` for FHIR type definitions

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build

# Watch mode for development
npm run dev

# Clean build artifacts
npm run clean
```

### Project Structure

```
├── src/
│   ├── index.ts                    # Main exports
│   └── sdc-swm-protocol.ts         # Complete type definitions
├── docs/
│   ├── sdc-swm-intro.md           # Protocol introduction
│   └── sdc-swm-protocol.md        # Full specification
├── dist/                          # Generated TypeScript definitions
└── package.json
```

### Integration

This package is designed to be used in:

- **SMART on FHIR applications** that need SDC questionnaire rendering
- **Form rendering engines** that implement the SDC-SWM protocol
- **EHR systems** that want to embed questionnaire functionality
- **Clinical decision support** tools using FHIR questionnaires

## 🤝 Contributing

This repository is maintained by the **HL7 FHIR community**. Contributions are welcome!

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Guidelines

- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation for API changes
- Ensure TypeScript compilation succeeds
- Follow [HL7 FHIR contribution guidelines](https://confluence.hl7.org/display/FHIR/FHIR+Contribution+Framework)

## 📄 License

This project is licensed under the **BSD 3-Clause License** - see the [LICENSE](./LICENSE) file for details.

## 🔗 Related Projects

- **[HL7 FHIR SDC Implementation Guide](https://hl7.org/fhir/uv/sdc/)** - FHIR SDC specification
- **[SMART Web Messaging](https://hl7.org/fhir/uv/smart-web-messaging/)** - Base messaging protocol
- **[@types/fhir](https://www.npmjs.com/package/@types/fhir)** - FHIR TypeScript definitions

---

<div align="center">

**Made with ❤️ by the HL7 FHIR Community**

[Report Bug](https://github.com/FHIR/sdc-smart-web-messaging/issues) · [Request Feature](https://github.com/FHIR/sdc-smart-web-messaging/issues) · [Documentation](./docs/)

</div>
