import * as Path from "node:path";
import { fileURLToPath } from "node:url";
import { APIBuilder, mkCodegenLogger, prettyReport } from "@atomic-ehr/codegen";

const __dirname = Path.dirname(fileURLToPath(import.meta.url));

// The canonical manager copies the local structure-definitions folder into
// node_modules, then runs `npm install` for each declared dependency. On npm 10
// (Node 22, e.g. CI) that reify step prunes the just-copied local package as
// "extraneous", so it disappears before scanning and generation fails with
// "Package example.folder.structures not found". This flag skips the redundant
// dependency install (hl7.fhir.r4.core is already pulled in by hl7.fhir.us.core)
// while keeping the dependency metadata, so the local package survives the scan.
process.env.FCM_SKIP_LOCAL_DEP_INSTALL = "1";

const main = async () => {
  console.log("📦 Generating Python FHIR R4 Core + US Core Types...");

  // US Core 8.0.1 brings hl7.fhir.r4.core in as a dependency, so a single
  // generation emits both the base R4 types/profiles (bodyweight, extensions)
  // and the US Core profiles. The local ExampleTypedBundle SD adds a
  // typed-bundle profile.
  const logger = mkCodegenLogger({
    prefix: "API",
    suppressTags: ["#fieldTypeNotFound", "#largeValueSet"],
  });

  const builder = new APIBuilder({ logger })
    .throwException()
    .fromPackage("hl7.fhir.us.core", "8.0.1")
    .localStructureDefinitions({
      package: { name: "example.folder.structures", version: "0.0.1" },
      path: Path.join(__dirname, "structure-definitions"),
      dependencies: [{ name: "hl7.fhir.r4.core", version: "4.0.1" }],
    })
    .python({
      allowExtraFields: false,
      primitiveTypeExtension: true,
      generateProfile: true,
      client: "fhirpy",
      fieldFormat: "camelCase",
    })
    .typeSchema({
      treeShake: {
        "hl7.fhir.r4.core": {
          "http://hl7.org/fhir/StructureDefinition/Bundle": {},
          "http://hl7.org/fhir/StructureDefinition/OperationOutcome": {},
          "http://hl7.org/fhir/StructureDefinition/DomainResource": {},
          "http://hl7.org/fhir/StructureDefinition/BackboneElement": {},
          "http://hl7.org/fhir/StructureDefinition/Element": {},
          "http://hl7.org/fhir/StructureDefinition/Patient": {},
          "http://hl7.org/fhir/StructureDefinition/Observation": {},
          "http://hl7.org/fhir/StructureDefinition/Organization": {},
          "http://hl7.org/fhir/StructureDefinition/bodyweight": {},
          // Extensions
          "http://hl7.org/fhir/StructureDefinition/patient-birthPlace": {},
          "http://hl7.org/fhir/StructureDefinition/patient-nationality": {},
          "http://hl7.org/fhir/StructureDefinition/humanname-own-prefix": {},
          "http://hl7.org/fhir/StructureDefinition/patient-birthTime": {},
        },
        "hl7.fhir.us.core": {
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient": {},
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-pressure": {},
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-body-weight": {},
        },
        "example.folder.structures": {
          "http://example.org/fhir/StructureDefinition/ExampleTypedBundle": {},
        },
      },
    })
    .outputTo("./fhir_types")
    .cleanOutput(true);

  const report = await builder.generate();
  console.log(prettyReport(report));
  if (!report.success) process.exit(1);
};

main();
