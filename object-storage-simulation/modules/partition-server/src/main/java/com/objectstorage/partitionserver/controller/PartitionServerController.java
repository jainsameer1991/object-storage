package com.objectstorage.partitionserver.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/partition-server")
public class PartitionServerController {
    @GetMapping("/health")
    public String health() {
        return "Partition Server is up";
    }
    // TODO: Add endpoints for file storage, status, etc.
} 