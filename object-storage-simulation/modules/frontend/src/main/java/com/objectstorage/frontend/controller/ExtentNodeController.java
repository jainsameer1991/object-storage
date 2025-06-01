package com.objectstorage.frontend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/extent-node")
@CrossOrigin(origins = "http://localhost:5173")
public class ExtentNodeController {
    @GetMapping("/retrieve/{id}")
    public ResponseEntity<Map<String, String>> retrieve(@PathVariable("id") String id) {
        String status = com.objectstorage.frontend.controller.FileController.componentStatus.getOrDefault(id, "up");
        Map<String, String> result = new HashMap<>();
        result.put("extentNodeId", id);
        if ("up".equals(status)) {
            result.put("chunk", "dummy-chunk-data");
            return ResponseEntity.ok(result);
        } else {
            result.put("error", "Extent Node is down");
            return ResponseEntity.status(503).body(result);
        }
    }
    // TODO: Add endpoints for extent node operations, status, etc.
} 