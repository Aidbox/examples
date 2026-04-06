import { APIBuilder } from "@atomic-ehr/codegen";

console.log("Generating UK Core R4 Types...");

const builder = new APIBuilder()
    .fromPackage("hl7.fhir.r4.core", "4.0.1")
    .fromPackageRef("https://fs.get-ig.org/-/fhir.r4.ukcore.stu2-2.0.2.tgz")
    .typescript({
        withDebugComment: false,
        generateProfile: true,
        openResourceTypeSet: false,
    })
    .outputTo("./src/fhir-types")
    .cleanOutput(true);

const report = await builder.generate();

console.log(report);

if (report.success) {
    console.log("UK Core R4 types generated successfully!");
} else {
    console.error("Generation failed.");
    process.exit(1);
}
