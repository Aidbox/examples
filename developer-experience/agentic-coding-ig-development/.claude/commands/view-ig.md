# View the published Implementation Guide

You are working with a FHIR Implementation Guide project for Chilean healthcare systems for a company named TESTCOMPANY

## Task

View the published Implementation Guide in the browser.

## Instructions
1. Check if python3 web server is running on port 8000: `lsof -ti:8000`
2. If not running, start the server: `cd ig-publisher/output && python3 -m http.server 8000 &` without waiting for it to finish starting up
3. Open the published Implementation Guide: `open http://localhost:8000/index.html`
