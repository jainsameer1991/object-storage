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
@RequestMapping("/partition-server")
@CrossOrigin(origins = "http://localhost:5173")
public class PartitionServerController {
    @GetMapping("/health")
    public String health() {
        return "Partition Server is up";
    }

    // GET /file/{filename}
    @GetMapping("/file/{filename}")
    public ResponseEntity<Map<String, String>> getFile(@PathVariable("filename") String filename) {
        // Dummy logic: always return some file metadata
        Map<String, String> result = new HashMap<>();
        result.put("filename", filename);
        result.put("primaryExtentNode", "Extent Node 1");
        result.put("secondaryExtentNode1", "Extent Node 2");
        result.put("secondaryExtentNode2", "Extent Node 3");
        return ResponseEntity.ok(result);
    }
    // TODO: Add endpoints for file storage, status, etc.
} 