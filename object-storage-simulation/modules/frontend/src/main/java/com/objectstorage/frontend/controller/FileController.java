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
    public static final Map<String, String> componentStatus = new HashMap<>();

    // Track partition server assignments: file name -> partition server
    private final Map<String, String> fileToPartitionServer = new HashMap<>();
    // Track partition manager leader election log
    private final List<String> pmLeaderElectionLog = new ArrayList<>();

    // For each file: store its primary and two secondary extent nodes
    public static final Map<String, List<String>> fileToExtentNodes = new HashMap<>();

    // Configurable group sizes
    private static final int PARTITION_SERVER_COUNT = 3;
    private static final int EXTENT_NODE_COUNT = 5;
    private static final List<String> COMPONENTS = new ArrayList<>();
    static {
        COMPONENTS.add("Front-End Service");
        COMPONENTS.add("Partition Manager");
        for (int i = 1; i <= PARTITION_SERVER_COUNT; i++) {
            COMPONENTS.add("Partition Server " + i);
        }
        COMPONENTS.add("Stream Manager");
        for (int i = 1; i <= EXTENT_NODE_COUNT; i++) {
            COMPONENTS.add("Extent Node " + i);
        }
    }

    @PostConstruct
    public void initComponentStatus() {
        componentStatus.clear();
        for (String name : COMPONENTS) {
            componentStatus.put(name, "up");
        }
        // Initialize files
        files.clear();
        files.add(new HashMap<>(Map.of("name", "report.pdf")));
        files.add(new HashMap<>(Map.of("name", "photo.jpg")));
        files.add(new HashMap<>(Map.of("name", "notes.txt")));
        files.add(new HashMap<>(Map.of("name", "data.csv")));
        files.add(new HashMap<>(Map.of("name", "slides.pptx")));
        migrationLog.clear();
        pmLeaderElectionLog.clear();
        // Assign files to partition servers and extent nodes
        fileToPartitionServer.clear();
        fileToExtentNodes.clear();
        for (Map<String, String> file : files) {
            String fname = file.get("name");
            int psIdx = (fname.hashCode() & Integer.MAX_VALUE) % PARTITION_SERVER_COUNT + 1;
            fileToPartitionServer.put(fname, "Partition Server " + psIdx);
            // Assign 3 extent nodes (primary + 2 replicas) in round-robin, offset by file hash
            int base = (fname.hashCode() & Integer.MAX_VALUE) % EXTENT_NODE_COUNT;
            List<String> extents = new ArrayList<>();
            for (int j = 0; j < 3; j++) {
                int idx = (base + j) % EXTENT_NODE_COUNT + 1;
                extents.add("Extent Node " + idx);
            }
            fileToExtentNodes.put(fname, extents);
        }
    }

    @GetMapping("/system/status")
    public List<Map<String, String>> getSystemStatus() {
        List<Map<String, String>> status = new ArrayList<>();
        for (String name : COMPONENTS) {
            status.add(Map.of("name", name, "status", componentStatus.getOrDefault(name, "up")));
        }
        return status;
    }

    @GetMapping("/partition-servers")
    public List<Map<String, Object>> getPartitionServers() {
        // Build a list of partition servers and their files
        List<Map<String, Object>> result = new ArrayList<>();
        for (int i = 1; i <= PARTITION_SERVER_COUNT; i++) {
            String psName = "Partition Server " + i;
            List<String> filesHandled = new ArrayList<>();
            for (Map.Entry<String, String> entry : fileToPartitionServer.entrySet()) {
                if (entry.getValue().equals(psName)) {
                    filesHandled.add(entry.getKey());
                }
            }
            result.add(Map.of(
                "name", psName,
                "status", componentStatus.getOrDefault(psName, "up"),
                "files", filesHandled
            ));
        }
        return result;
    }

    @PostMapping("/system/status")
    public Map<String, Object> setComponentStatus(@RequestBody Map<String, String> body) {
        String name = body.getOrDefault("name", "");
        String status = body.getOrDefault("status", "up");
        List<Map<String, String>> migrations = new ArrayList<>();
        if (componentStatus.containsKey(name)) {
            // If bringing an extent node down, do NOT migrate files; just mark node as down
            // The set of extent nodes for each file remains fixed
            // If bringing a partition server down, reassign its files
            if (name.startsWith("Partition Server") && status.equals("down") && componentStatus.get(name).equals("up")) {
                // Find available partition servers
                List<String> availablePS = new ArrayList<>();
                for (int i = 1; i <= PARTITION_SERVER_COUNT; i++) {
                    String ps = "Partition Server " + i;
                    if (!ps.equals(name) && componentStatus.getOrDefault(ps, "up").equals("up")) {
                        availablePS.add(ps);
                    }
                }
                // For each file assigned to the downed PS, move to another available PS
                List<String> toReassign = new ArrayList<>();
                for (Map.Entry<String, String> entry : fileToPartitionServer.entrySet()) {
                    if (entry.getValue().equals(name)) {
                        toReassign.add(entry.getKey());
                    }
                }
                for (String fname : toReassign) {
                    if (!availablePS.isEmpty()) {
                        String newPS = availablePS.get(new Random().nextInt(availablePS.size()));
                        fileToPartitionServer.put(fname, newPS);
                    }
                }
            }
            // If bringing a partition server up, reassign files to it (simulate rebalance)
            if (name.startsWith("Partition Server") && status.equals("up") && componentStatus.get(name).equals("down")) {
                // Rebalance: assign some files back to this PS
                List<String> allFiles = new ArrayList<>(fileToPartitionServer.keySet());
                for (String fname : allFiles) {
                    int psIdx = (fname.hashCode() & Integer.MAX_VALUE) % PARTITION_SERVER_COUNT + 1;
                    String idealPS = "Partition Server " + psIdx;
                    if (idealPS.equals(name)) {
                        fileToPartitionServer.put(fname, name);
                    }
                }
            }
            // Partition Manager leader election simulation
            if (name.equals("Partition Manager") && status.equals("down") && componentStatus.get(name).equals("up")) {
                componentStatus.put("Partition Manager", "down");
                synchronized (pmLeaderElectionLog) {
                    pmLeaderElectionLog.add("Leader election is happening...");
                }
                new Thread(() -> {
                    try { Thread.sleep(300); } catch (InterruptedException ignored) {}
                    componentStatus.put("Partition Manager", "up");
                    synchronized (pmLeaderElectionLog) {
                        pmLeaderElectionLog.add("Leader election complete. New Partition Manager leader is active.");
                    }
                }).start();
                Map<String, Object> resp = new HashMap<>();
                resp.put("name", name);
                resp.put("status", componentStatus.getOrDefault(name, "down"));
                resp.put("migrations", migrations);
                return resp;
            }
            componentStatus.put(name, status);
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("name", name);
        resp.put("status", componentStatus.getOrDefault(name, "up"));
        resp.put("migrations", migrations);
        return resp;
    }

    @GetMapping("/partition-manager/leader-election-log")
    public List<String> getPmLeaderElectionLog() {
        synchronized (pmLeaderElectionLog) {
            return new ArrayList<>(pmLeaderElectionLog);
        }
    }

    @GetMapping
    public List<Map<String, Object>> listFiles() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, String> file : files) {
            String fname = file.get("name");
            List<String> extents = fileToExtentNodes.getOrDefault(fname, List.of());
            Map<String, Object> entry = new HashMap<>();
            entry.put("name", fname);
            entry.put("primary", extents.size() > 0 ? extents.get(0) : null);
            entry.put("secondary1", extents.size() > 1 ? extents.get(1) : null);
            entry.put("secondary2", extents.size() > 2 ? extents.get(2) : null);
            result.add(entry);
        }
        return result;
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
        steps.add("Partition Server handling metadata...");
        steps.add("Stream Manager locating extent...");

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
        List<Map<String, String>> components = new ArrayList<>();
        for (String name : COMPONENTS) {
            components.add(Map.of("name", name, "status", componentStatus.getOrDefault(name, "up")));
        }
        String result = "success";
        String message = "File found.";
        List<String> path = new ArrayList<>();
        String fileNode = null;
        String partitionServer = null;
        List<String> extents = fileToExtentNodes.getOrDefault(filename, List.of());
        // Partition Manager: map file to partition server
        if (fileToPartitionServer.containsKey(filename)) {
            partitionServer = fileToPartitionServer.get(filename);
        } else {
            partitionServer = "Partition Server 1";
        }
        String streamManager = "Stream Manager";
        // Partition Server: try primary, then secondaries
        String foundNode = null;
        for (String node : extents) {
            if (componentStatus.getOrDefault(node, "up").equals("up")) {
                foundNode = node;
                break;
            }
        }
        if (foundNode != null) {
            fileNode = foundNode;
            path = List.of("Front-End Service", "Partition Manager", partitionServer, streamManager, fileNode);
            result = "success";
            message = "File found at " + fileNode + ". System is available.";
        } else {
            // All extent nodes for this file are down
            path = List.of("Front-End Service", "Partition Manager", partitionServer, streamManager);
            result = "failure";
            message = "Blob Unavailable: All extent nodes for this file are down (HTTP 503).";
        }
        // Consistency/availability logic for FE, PM, PS, SM
        if (componentStatus.get("Front-End Service").equals("down")) {
            result = "failure";
            message = "Front-End Service is down. System unavailable.";
            path = List.of("Front-End Service");
        } else if (componentStatus.get("Partition Manager").equals("down")) {
            result = "failure";
            message = "Partition Manager is down. Leader election in progress...";
            path = List.of("Front-End Service", "Partition Manager");
        } else if (componentStatus.get(partitionServer).equals("down")) {
            // Try to find another healthy PS
            String healthyPS = null;
            for (int i = 1; i <= PARTITION_SERVER_COUNT; i++) {
                String ps = "Partition Server " + i;
                if (componentStatus.getOrDefault(ps, "up").equals("up")) {
                    healthyPS = ps;
                    break;
                }
            }
            if (healthyPS != null) {
                partitionServer = healthyPS;
                message = "Original Partition Server is down. Request served by " + healthyPS + ".";
                path = List.of("Front-End Service", "Partition Manager", healthyPS, streamManager);
            } else {
                result = "failure";
                message = "All Partition Servers are down. Cannot access file metadata.";
                path = List.of("Front-End Service", "Partition Manager");
            }
        } else if (componentStatus.get(streamManager).equals("down")) {
            result = "failure";
            message = "Stream Manager is down. Cannot locate extent.";
            path = List.of("Front-End Service", "Partition Manager", partitionServer, streamManager);
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("components", components);
        resp.put("path", path);
        resp.put("result", result);
        resp.put("message", message);
        return resp;
    }
} 