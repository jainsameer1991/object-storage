package com.objectstorage.streammanager.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/stream-manager")
public class StreamManagerController {
    @GetMapping("/health")
    public String health() {
        return "Stream Manager is up";
    }
    // TODO: Add endpoints for stream management, status, etc.
} 