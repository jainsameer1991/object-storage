package com.objectstorage.frontend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.List;

@RestController
@RequestMapping("/stream-manager")
@CrossOrigin(origins = "http://localhost:5173")
public class StreamManagerController {
    @PostMapping("/get-file")
    public ResponseEntity<Map<String, String>> getFile(@RequestBody Map<String, Object> body) {
        String filename = Objects.toString(body.get("filename"), "");
        List<String> extents = com.objectstorage.frontend.controller.FileController.fileToExtentNodes.getOrDefault(filename, List.of());
        String foundNode = null;
        for (String node : extents) {
            if ("up".equals(com.objectstorage.frontend.controller.FileController.componentStatus.getOrDefault(node, "up"))) {
                foundNode = node;
                break;
            }
        }
        Map<String, String> result = new HashMap<>();
        result.put("filename", filename);
        if (foundNode != null) {
            result.put("extentNodeId", foundNode);
            return ResponseEntity.ok(result);
        } else {
            result.put("error", "All extent nodes for this file are down (HTTP 503)");
            return ResponseEntity.status(503).body(result);
        }
    }
    // TODO: Add endpoints for stream management, status, etc.
} 