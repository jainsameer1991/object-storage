package com.objectstorage.frontend.controller;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/partition-manager")
@CrossOrigin(origins = "http://localhost:5173")
public class PartitionManagerController {
    @GetMapping("/health")
    public String health() {
        return "Partition Manager is up";
    }

    // GET /partition-for-key?key=...
    @GetMapping("/partition-for-key")
    public ResponseEntity<Map<String, String>> getPartitionForKey(@RequestParam("key") String key) {
        Map<String, String> result = new HashMap<>();
        result.put("partitionServer", "Partition Server 1");
        result.put("key", key != null ? key : "none");
        return ResponseEntity.ok(result);
    }
    // TODO: Add endpoints for partition assignment, status, etc.
} 