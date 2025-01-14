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
public class HelloController {

  @Autowired
  private CqlEvaluateService evaluateService;

  @PostMapping("/")
  public String index(@RequestBody String body) {
    try {
      ObjectMapper objectMapper = new ObjectMapper();
      JsonNode rootNode = objectMapper.readTree(body);
      String libraryName = rootNode.path("request").path("route-params").path("library").asText();
      String expressionName = rootNode.path("request").path("route-params").path("expressionName").asText();
      return evaluateService.evaluate(libraryName, expressionName);

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
