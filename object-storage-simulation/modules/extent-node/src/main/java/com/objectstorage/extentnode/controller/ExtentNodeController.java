package com.objectstorage.extentnode.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/extent-node")
public class ExtentNodeController {
    @GetMapping("/health")
    public String health() {
        return "Extent Node is up";
    }
    // TODO: Add endpoints for extent node operations, status, etc.
} 