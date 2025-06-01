package com.objectstorage.frontend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/files")
@CrossOrigin(origins = "http://localhost:5173")
public class FileController {

    // In-memory file list (mutable)
    private final List<Map<String, String>> files = new ArrayList<>();
    // In-memory migration log
    private final List<Map<String, String>> migrationLog = new ArrayList<>();

    // In-memory state for component statuses
    private final Map<String, String> componentStatus = new HashMap<>();

    @PostConstruct
    public void initComponentStatus() {
        componentStatus.put("Front-End Service", "up");
        componentStatus.put("Partition Manager", "up");
        componentStatus.put("Extent Node 1", "up");
        componentStatus.put("Extent Node 2", "up");
        componentStatus.put("Extent Node 3", "up");
        // Initialize files
        files.clear();
        files.add(new HashMap<>(Map.of("name", "report.pdf", "location", "Extent Node 1")));
        files.add(new HashMap<>(Map.of("name", "photo.jpg", "location", "Extent Node 2")));
        files.add(new HashMap<>(Map.of("name", "notes.txt", "location", "Extent Node 3")));
        migrationLog.clear();
    }

    @GetMapping("/system/status")
    public List<Map<String, String>> getSystemStatus() {
        List<Map<String, String>> status = new ArrayList<>();
        for (String name : List.of("Front-End Service", "Partition Manager", "Extent Node 1", "Extent Node 2", "Extent Node 3")) {
            status.add(Map.of("name", name, "status", componentStatus.getOrDefault(name, "up")));
        }
        return status;
    }

    @PostMapping("/system/status")
    public Map<String, Object> setComponentStatus(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "");
        String status = body.getOrDefault("status", "up");
        List<Map<String, String>> migrations = new ArrayList<>();
        if (componentStatus.containsKey(name)) {
            // If bringing an extent node down, migrate its files
            if (name.startsWith("Extent Node") && status.equals("down") && componentStatus.get(name).equals("up")) {
                // Find available nodes
                List<String> availableNodes = new ArrayList<>();
                for (String node : List.of("Extent Node 1", "Extent Node 2", "Extent Node 3")) {
                    if (!node.equals(name) && componentStatus.getOrDefault(node, "up").equals("up")) {
                        availableNodes.add(node);
                    }
                }
                // For each file on the downed node, move to another available node
                for (Map<String, String> file : files) {
                    if (file.get("location").equals(name)) {
                        if (!availableNodes.isEmpty()) {
                            String newNode = availableNodes.get(new Random().nextInt(availableNodes.size()));
                            String oldNode = file.get("location");
                            file.put("location", newNode);
                            Map<String, String> migration = new HashMap<>();
                            migration.put("file", file.get("name"));
                            migration.put("from", oldNode);
                            migration.put("to", newNode);
                            migrations.add(migration);
                            migrationLog.add(migration);
                        }
                    }
                }
            }
            componentStatus.put(name, status);
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("name", name);
        resp.put("status", componentStatus.getOrDefault(name, "up"));
        resp.put("migrations", migrations);
        return resp;
    }

    @GetMapping
    public List<Map<String, String>> listFiles() {
        return files;
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Map<String, Object>> getFile(@PathVariable("filename") String filename) {
        Optional<Map<String, String>> file = files.stream()
            .filter(f -> f.get("name").equalsIgnoreCase(filename))
            .findFirst();

        Map<String, Object> response = new HashMap<>();
        List<String> steps = new ArrayList<>();
        steps.add("Contacting Front-End Service...");
        steps.add("Partition Manager locating file...");

        if (file.isPresent()) {
            steps.add(file.get().get("location") + " serving file...");
            response.put("name", file.get().get("name"));
            response.put("location", file.get().get("location"));
            response.put("steps", steps);
            return ResponseEntity.ok(response);
        } else {
            steps.add("File not found in any Extent Node.");
            response.put("steps", steps);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
        }
    }

    @PostMapping("/simulate")
    public Map<String, Object> simulateGet(@RequestBody Map<String, String> body) {
        String filename = body.getOrDefault("filename", "");
        // Use current state
        List<Map<String, String>> components = new ArrayList<>();
        for (String name : List.of("Front-End Service", "Partition Manager", "Extent Node 1", "Extent Node 2", "Extent Node 3")) {
            components.add(Map.of("name", name, "status", componentStatus.getOrDefault(name, "up")));
        }
        String result = "success";
        String message = "File found.";
        List<String> path = List.of("Front-End Service", "Partition Manager", "Extent Node 1");
        String fileNode = null;
        Optional<Map<String, String>> fileOpt = files.stream().filter(f -> f.get("name").equalsIgnoreCase(filename)).findFirst();
        if (fileOpt.isPresent()) {
            fileNode = fileOpt.get().get("location");
            path = List.of("Front-End Service", "Partition Manager", fileNode);
        } else {
            // File not found
            result = "failure";
            message = "File not found in any Extent Node.";
            path = List.of("Front-End Service", "Partition Manager");
        }
        // Consistency/availability logic
        if (componentStatus.get("Front-End Service").equals("down")) {
            result = "failure";
            message = "Front-End Service is down. System unavailable.";
            path = List.of("Front-End Service");
        } else if (componentStatus.get("Partition Manager").equals("down")) {
            result = "failure";
            message = "Partition Manager is down. Cannot locate file.";
            path = List.of("Front-End Service", "Partition Manager");
        } else if (fileNode != null && componentStatus.get(fileNode).equals("down")) {
            // File's node is down, but file should have been migrated if possible
            result = "failure";
            message = fileNode + " is down. File unavailable. (No replica present)";
            path = List.of("Front-End Service", "Partition Manager", fileNode);
        } else if (fileNode == null) {
            // Already handled above
        } else {
            result = "success";
            message = "File found at " + fileNode + ". System is available.";
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("components", components);
        resp.put("path", path);
        resp.put("result", result);
        resp.put("message", message);
        return resp;
    }
} 