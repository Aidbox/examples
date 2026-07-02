import { APIBuilder, mkCodegenLogger, prettyReport } from "@atomic-ehr/codegen";

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
      path: "./structure-definitions",
      // No `dependencies` here: hl7.fhir.r4.core is already provided by
      // fromPackage("hl7.fhir.us.core"). Declaring it again makes the canonical
      // manager re-run `npm install hl7.fhir.r4.core`, which on npm 10 prunes
      // this just-copied local package ("Package example.folder.structures not
      // found"). Resolving r4.core from the shared package set avoids that.
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
