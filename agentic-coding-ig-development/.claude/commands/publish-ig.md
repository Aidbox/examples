# Publish Implementation Guide

You are working with a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY

## Task
Publish the implementation Guide using publisher.jar

## Available Resources

- FHIR resources are in `target/` directory
- ig.ini file path is ig-publisher/ig.ini.
- ig-publisher/IG.json is the FHIR Implementation Guide resource for the current IG.
- publisher.jar is /ig-publisher/publisher.jar

## Instructions
1. remove all files from ig-publisher/input/resources directory and replace it with the content of target/ directory
2. clear the ig-publisher/output directory
3. run publisher by `cd ig-publisher && java -jar publisher.jar -ig ig.ini`
4. the main results are in output/qa.html file
5. after running the publisher analyse the results and provide summary.
