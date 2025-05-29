package com.objectstorage.frontend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ObjectController {
    @GetMapping("/get-object/{objectId}")
    public String getObject(@PathVariable String objectId) {
        // For now, just return a simple message
        return "Frontend received GET for object: " + objectId;
    }
} 