package com.cql.app.example.controllers;
import com.cql.app.example.services.CqlEvaluateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.PrintWriter;
import java.io.StringWriter;



@RestController
public class CqlController {

  @Autowired
  private CqlEvaluateService evaluateService;

  public String cqlLibraryEvaluate(JsonNode body) {
    String libraryName = body.path("request").path("route-params").path("libraryName").asText();
    return evaluateService.evaluate(libraryName);
  }

  @PostMapping("/")
  public String index(@RequestBody String body) {
    try {
      ObjectMapper objectMapper = new ObjectMapper();
      JsonNode jsonBody = objectMapper.readTree(body);
      String operationID = jsonBody.path("operation").path("id").asText();
        if (operationID.equals("cql-library-evaluate")) {
            return cqlLibraryEvaluate(jsonBody);
        }
        return "Operation " + operationID + " not founded in App";

    } catch (Exception e) {
      try {
        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        e.printStackTrace(printWriter);
        return stringWriter.toString();
      } catch (Exception ee) {
        return "error";
      }
    }
  }
}
