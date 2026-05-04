import { APIBuilder, mkCodegenLogger, prettyReport } from "@atomic-ehr/codegen";

const main = async () => {
  const logger = mkCodegenLogger({
    suppressTags: ["#fieldTypeNotFound", "#duplicateSchema", "#duplicateCanonical", "#largeValueSet"],
  });

  const builder = new APIBuilder({ logger })
    .fromPackage("hl7.fhir.us.core", "8.0.1")
    .typeSchema({
      treeShake: {
        "hl7.fhir.us.core": {
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient": {},
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-blood-pressure": {},
        },
        "hl7.fhir.r4.core": {
          "http://hl7.org/fhir/StructureDefinition/Bundle": {},
        },
      },
    })
    .typescript({
      generateProfile: true,
    })
    .outputTo("./fhir-types")
    .cleanOutput(true);

  const report = await builder.generate();
  console.log(prettyReport(report));
  if (!report.success) process.exit(1);
};

main();
