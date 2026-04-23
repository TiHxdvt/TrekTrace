package com.trektrace.controller;

import com.trektrace.dto.DataSummaryResponse;
import com.trektrace.service.ActivityService;
import com.trektrace.service.ChatService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.util.Map;

@RestController
@RequestMapping("/api/data")
public class DataManagementController {

    private final ActivityService activityService;
    private final ChatService chatService;

    public DataManagementController(ActivityService activityService, ChatService chatService) {
        this.activityService = activityService;
        this.chatService = chatService;
    }

    private Long getUserId(Authentication auth) {
        return (Long) auth.getPrincipal();
    }

    @GetMapping("/summary")
    public ResponseEntity<DataSummaryResponse> getSummary(Authentication auth) {
        return ResponseEntity.ok(activityService.getDataSummary(getUserId(auth)));
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportData(
            @RequestParam(defaultValue = "json") String format,
            Authentication auth) {
        if (!"json".equals(format)) {
            return ResponseEntity.badRequest().body(Map.of("error", "目前仅支持 json 格式"));
        }

        Long userId = getUserId(auth);
        StreamingResponseBody body = outputStream ->
                activityService.exportDataStreaming(userId, format, outputStream);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=trektrace_export.json")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body);
    }

    @DeleteMapping("/activities")
    public ResponseEntity<Void> deleteAllActivities(Authentication auth) {
        activityService.deleteAllByUserId(getUserId(auth));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/chat")
    public ResponseEntity<Void> deleteAllChatData(Authentication auth) {
        chatService.deleteAllChatData(getUserId(auth));
        return ResponseEntity.noContent().build();
    }
}
